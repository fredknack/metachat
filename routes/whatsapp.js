const express = require('express');
const router = express.Router();
const twilioClient = require('../lib/twilioClient');
const sessionStore = require('../lib/sessionStore');

async function sendSwagOptions(to) {
  const swagItems = [
    {
      name: 'Wallet',
      imageUrl: 'https://bot.jumpwire.xyz/hats/wallet.jpg',
      body: '1️⃣ Wallet'
    },
    {
      name: 'Sunglasses',
      imageUrl: 'https://bot.jumpwire.xyz/hats/sunglasses.jpg',
      body: '2️⃣ Sunglasses'
    },
    {
      name: 'Water Bottle',
      imageUrl: 'https://bot.jumpwire.xyz/hats/waterbottle.jpg',
      body: '3️⃣ Water Bottle'
    }
  ];

  for (const item of swagItems) {
    try {
      await twilioClient.client.messages.create({
        from: 'whatsapp:+14155238886',  // sandbox or production, set via env
        to,
        mediaUrl: [item.imageUrl],
        body: item.body
      });
      console.log(`✅ Sent swag image: ${item.name} to ${to}`);
    } catch (err) {
      console.error(`❌ Failed to send ${item.name} image to ${to}:`, err);
    }
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
  if (!from || !incomingMsg) return res.status(400).send('Bad Request');

  const session = sessionStore.getOrCreate(from);

  if (incomingMsg === 'start' || incomingMsg === 'reset') {
    sessionStore.reset(from);
    return res.set('Content-Type', 'text/xml').send(`
      <Response><Message>👋 Welcome to CNX - Every connection is an opportunity. It's your world.

Meta and Salesforce are helping businesses create seamless engagement.
Do you want to learn more?
1. Yes
2. No</Message></Response>
    `);
  }

  let reply = '';
  console.log(`[DEBUG] User: ${from}, Incoming: ${incomingMsg}, Current stage: ${session.stage}`);

  switch (session.stage) {
    case 'intro':
      if (incomingMsg === '1') {
        sessionStore.update(from, { stage: 'swag' });
        reply = 'Great! Here’s more info: https://invite.salesforce.com\nWould you like some swag?\n1. Yes\n2. No';
      } else if (incomingMsg === '2') {
        sessionStore.update(from, { stage: 'skipToSwag' });
        reply = `That’s okay, this conversation will remain open if you want to come back and learn more anytime.

Everything you’ve just experienced is available for Salesforce customers to run natively out of Marketing Cloud. You can have 2-way conversations with customers and help them learn more about your product offerings and services.

Finally, while I have you here, can I interest you in some SWAG?
1. Yes
2. No`;
      } else {
        reply = 'Please reply with 1 (Yes) or 2 (No).';
      }
      break;

    case 'learn':
      sessionStore.update(from, { stage: 'swag' });
      reply = 'Visit: https://invite.salesforce.com\nInterested in swag?\n1. Yes\n2. No';
      break;

    case 'skipToSwag':
      if (incomingMsg === '1') {
        sessionStore.update(from, { stage: 'select' });

        res.set('Content-Type', 'text/xml').send(`
          <Response><Message>Pick your swag:\n1. Wallet\n2. Sunglasses\n3. Water Bottle</Message></Response>
        `);

        sendSwagOptions(from); // run in background, no await
        return;
      } else if (incomingMsg === '2') {
        sessionStore.update(from, { stage: 'completed' });
        reply = 'Thanks for your participation! We hope to connect with you again soon. 🎉';
      } else {
        reply = 'Please reply with 1 (Yes) or 2 (No).';
      }
      break;

    case 'swag':
      if (incomingMsg === '1') {
        sessionStore.update(from, { stage: 'select' });

        res.set('Content-Type', 'text/xml').send(`
          <Response><Message>Pick your swag:\n1. Wallet\n2. Sunglasses\n3. Water Bottle</Message></Response>
        `);

        sendSwagOptions(from); // run in background, no await
        return;
      } else if (incomingMsg === '2') {
        sessionStore.clear(from);
        reply = 'Thanks for participating!';
      } else {
        reply = 'Please reply with 1 (Yes) or 2 (No).';
      }
      break;

    case 'select':
      if (['1', '2', '3'].includes(incomingMsg)) {
        const hat = incomingMsg === '1' ? 'Wallet' : incomingMsg === '2' ? 'Sunglasses' : 'WaterBottle';
        const hatFormatted = hat.replace(/([A-Z])/g, ' $1').trim();

        sessionStore.update(from, { selectedHat: hat, stage: 'checkout' });

        // Send image response first to WhatsApp (non-blocking)
        twilioClient.client.messages.create({
          from: 'whatsapp:+14155238886',
          to: from,
          mediaUrl: [`https://bot.jumpwire.xyz/hats/${hat.toLowerCase().replace(' ', '')}.jpg`],
          body: `✅ *Order Confirmed!*\n\nSwag: *${hatFormatted}*\nPrice: *$0*\nPickup: *Booth #12*\n\nShow this message at the booth to collect your swag. We hope you love it! 🎉`
        }).catch(err => console.error('❌ Error sending confirmed swag image:', err));

        twilioClient.sendFollowUpMessages(from);
        reply = 'Your swag selection has been confirmed! 🎉';
      } else {
        reply = 'Please reply with 1, 2, or 3 to select your swag.';
      }
      break;

    case 'checkout':
      if (incomingMsg === '1' && session.allowHatChange) {
        sessionStore.update(from, { stage: 'select' });

        // Reply first
        res.set('Content-Type', 'text/xml').send(`
          <Response><Message>Sure! Let's look at the swag again:\n1. Wallet\n2. Sunglasses\n3. Water Bottle</Message></Response>
        `);

        sendSwagOptions(from); // run in background, no await
        return;
      } else if (incomingMsg === '2') {
        sessionStore.clear(from);
        reply = 'Thanks for your visit! We hope you love your swag. 🎁';
      } else {
        reply = 'Please reply with 1 to pick new swag, or 2 to end the chat.';
      }
      break;

    default:
      sessionStore.update(from, { stage: 'intro' });
      reply = "I'm not sure what you meant. Send 'reset' to start over.";
      break;
  }

  if (reply) {
    res.set('Content-Type', 'text/xml');
    res.send(`<Response><Message>${reply}</Message></Response>`);
  }
});

module.exports = router;