// routes/whatsapp.js
const express = require('express');
const router = express.Router();
const twilioClient = require('../lib/twilioClient');
const sessionStore = require('../lib/sessionStore');

async function sendSwagOptions(to) {
  if (!to || to === twilioClient.fromNumber) {
    console.warn(`⚠️ Skipping swag send: to and from are identical (${to})`);
    return;
  }

  console.log(`📤 Preparing to send swag options TO ${to}`);

  try {
    await Promise.all([
      twilioClient.client.messages.create({
        from: twilioClient.fromNumber,
        to,
        mediaUrl: ['https://bot.jumpwire.xyz/hats/wallet.jpg'],
        body: '1️⃣ Wallet'
      }),
      twilioClient.client.messages.create({
        from: twilioClient.fromNumber,
        to,
        mediaUrl: ['https://bot.jumpwire.xyz/hats/sunglasses.jpg'],
        body: '2️⃣ Sunglasses'
      }),
      twilioClient.client.messages.create({
        from: twilioClient.fromNumber,
        to,
        mediaUrl: ['https://bot.jumpwire.xyz/hats/waterbottle.jpg'],
        body: '3️⃣ Water Bottle'
      })
    ]);
    console.log(`✅ Swag options sent TO ${to}`);
  } catch (err) {
    console.error(`❌ Error sending swag options to ${to}:`, err);
  }
}

router.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  const VERIFY_TOKEN = 'JumpwireWhatsAppSecret9834';

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Meta Webhook verified successfully!');
      res.status(200).send(challenge);
    } else {
      console.warn('❌ Invalid verify token');
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

router.post('/', async (req, res) => {
  const { From: from, Body } = req.body;
  const incomingMsg = Body?.trim().toLowerCase();

  if (!from || !incomingMsg) {
    console.warn(`⚠️ Invalid webhook payload: From=${from}, Body=${incomingMsg}`);
    return res.status(400).send('Bad Request');
  }

  const user = from;
  console.log(`[DEBUG] User: ${user}, Incoming: ${incomingMsg}`);

  const session = sessionStore.getOrCreate(user);
  if (!session) {
    console.error(`❌ Could not create/retrieve session for user: ${user}`);
    return res.status(500).send('Server Error');
  }

  let reply = '';

  if (incomingMsg === 'start' || incomingMsg === 'reset') {
    sessionStore.reset(user);
    return res.set('Content-Type', 'text/xml').send(`
      <Response><Message>👋 Welcome to CNX - Every connection is an opportunity. It's your world.

Meta and Salesforce are helping businesses create seamless engagement.
Do you want to learn more?
1. Yes
2. No</Message></Response>
    `);
  }

  switch (session.stage) {
    case 'intro':
      if (incomingMsg === '1') {
        sessionStore.update(user, { stage: 'swag' });
        reply = 'Great! Here’s more info: https://invite.salesforce.com\nWould you like some swag?\n1. Yes\n2. No';
      } else if (incomingMsg === '2') {
        sessionStore.update(user, { stage: 'skipToSwag' });
        reply = `That’s okay, this conversation will remain open if you want to come back and learn more anytime.

Everything you’ve just experienced is available for Salesforce customers to run natively out of Marketing Cloud. You can have 2-way conversations with customers and help them learn more about your product offerings and services.

Finally, while I have you here, can I interest you in some SWAG?
1. Yes
2. No`;
      } else {
        reply = 'Please reply with 1 (Yes) or 2 (No).';
      }
      break;

    case 'skipToSwag':
    case 'swag':
      if (incomingMsg === '1') {
        sessionStore.update(user, { stage: 'select' });
        res.set('Content-Type', 'text/xml').send(`
          <Response><Message>Pick your swag:\n1. Wallet\n2. Sunglasses\n3. Water Bottle</Message></Response>
        `);
        await sendSwagOptions(user);
        return;
      } else if (incomingMsg === '2') {
        sessionStore.update(user, { stage: 'completed' });
        reply = 'Thanks for your participation! We hope to connect with you again soon. 🎉';
      } else {
        reply = 'Please reply with 1 (Yes) or 2 (No).';
      }
      break;

    case 'select':
      if (['1', '2', '3'].includes(incomingMsg)) {
        const hat = incomingMsg === '1' ? 'Wallet' : incomingMsg === '2' ? 'Sunglasses' : 'WaterBottle';
        const hatFormatted = hat.replace(/([A-Z])/g, ' $1').trim();

        sessionStore.update(user, { selectedHat: hat, stage: 'checkout' });

        if (user !== twilioClient.fromNumber) {
          await twilioClient.client.messages.create({
            from: twilioClient.fromNumber,
            to: user,
            mediaUrl: [`https://bot.jumpwire.xyz/hats/${hat.toLowerCase().replace(' ', '')}.jpg`],
            body: `✅ *Order Confirmed!*\n\nSwag: *${hatFormatted}*\nPrice: *$0*\nPickup: *Booth #12*\n\nShow this message at the booth to collect your swag. We hope you love it! 🎉`
          }).catch(err => console.error(`❌ Error sending confirmation to ${user}:`, err));

          twilioClient.sendFollowUpMessages(user, sessionStore);
        } else {
          console.warn(`⚠️ Skipping confirmation: to and from are identical (${user})`);
        }

        return;
      } else {
        reply = 'Please reply with 1, 2, or 3 to select your swag.';
      }
      break;

    case 'checkout':
      if (incomingMsg === '1' && session.allowHatChange) {
        sessionStore.update(user, { stage: 'select' });

        if (user !== twilioClient.fromNumber) {
          await twilioClient.client.messages.create({
            from: twilioClient.fromNumber,
            to: user,
            body: `Sure! Let's look at the swag again:\n1. Wallet\n2. Sunglasses\n3. Water Bottle`
          }).catch(err => console.error(`❌ Error resending swag menu to ${user}:`, err));

          await sendSwagOptions(user);
        } else {
          console.warn(`⚠️ Skipping resend: to and from are identical (${user})`);
        }
        return;
      } else if (incomingMsg === '2') {
        sessionStore.clear(user);
        reply = 'Thanks for your visit! We hope you love your swag. 🎁';
      } else {
        reply = 'Please reply with 1 to pick new swag, or 2 to end the chat.';
      }
      break;

    default:
      sessionStore.update(user, { stage: 'intro' });
      reply = "I'm not sure what you meant. Send 'reset' to start over.";
      break;
  }

  if (reply) {
    res.set('Content-Type', 'text/xml');
    res.send(`<Response><Message>${reply}</Message></Response>`);
  }
});

module.exports = router;