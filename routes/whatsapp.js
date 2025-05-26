const express = require('express');
const router = express.Router();
const twilioClient = require('../lib/twilioClient');
const sessionStore = require('../lib/sessionStore');

const FROM_NUMBER = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'JumpwireWhatsAppSecret9834';

// Helper for TwiML responses
function twimlResponse(message) {
  return `<Response><Message>${message}</Message></Response>`;
}

async function sendSwagOptions(to) {
  if (to === FROM_NUMBER) {
    console.error('❌ Cannot send swag options to FROM_NUMBER');
    return;
  }

  try {
    console.log(`[DEBUG] Sending swag options to ${to}`);
    await Promise.all([
      twilioClient.client.messages.create({
        from: FROM_NUMBER,
        to,
        mediaUrl: ['https://bot.jumpwire.xyz/hats/wallet.jpg'],
        body: '1️⃣ Wallet'
      }),
      twilioClient.client.messages.create({
        from: FROM_NUMBER,
        to,
        mediaUrl: ['https://bot.jumpwire.xyz/hats/sunglasses.jpg'],
        body: '2️⃣ Sunglasses'
      }),
      twilioClient.client.messages.create({
        from: FROM_NUMBER,
        to,
        mediaUrl: ['https://bot.jumpwire.xyz/hats/waterbottle.jpg'],
        body: '3️⃣ Water Bottle'
      })
    ]);
    console.log(`✅ Swag options sent to ${to}`);
  } catch (err) {
    console.error(`❌ Error sending swag options to ${to}:`, err);
  }
}

// Webhook verification
router.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Webhook verified!');
      res.status(200).send(challenge);
    } else {
      console.warn('❌ Invalid verify token');
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// Main webhook handler
router.post('/', async (req, res) => {
  const { From: from, Body } = req.body;
  const incomingMsg = Body?.trim().toLowerCase();

  if (!from || !incomingMsg) {
    console.warn(`⚠️ Invalid payload: From=${from}, Body=${incomingMsg}`);
    return res.status(400).send('Bad Request');
  }

  const user = from;
  const session = sessionStore.getOrCreateSession(user);

  console.log(`[DEBUG] User: ${user}, Incoming: ${incomingMsg}`);
  console.log(`[DEBUG] Current session for ${user}:`, session);

  let reply = '';

  if (incomingMsg === 'start' || incomingMsg === 'reset') {
    sessionStore.resetSession(user);
    sessionStore.update(user, { stage: 'intro' });

    console.log(`[DEBUG] Session after reset for ${user}:`, sessionStore.getOrCreateSession(user));

    return res.set('Content-Type', 'text/xml').send(
      twimlResponse(`👋 Welcome to CNX - Every connection is an opportunity. It's your world.

Meta and Salesforce are helping businesses create seamless engagement.
Do you want to learn more?
1. Yes
2. No`)
    );
  }

  switch (session.stage) {
    case 'intro':
      if (incomingMsg === '1') {
        sessionStore.update(user, { stage: 'swag' });
        reply = 'Great! Let’s move on to swag options.\n1. Yes\n2. No';
      } else if (incomingMsg === '2') {
        sessionStore.update(user, { stage: 'skipToSwag' });
        reply = `That's okay, you can come back anytime.

Everything you've just experienced is available natively in Salesforce Marketing Cloud.

Want some swag?
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
        res.set('Content-Type', 'text/xml').send(
          twimlResponse('Pick your swag:\n1. Wallet\n2. Sunglasses\n3. Water Bottle')
        );
        await sendSwagOptions(user);
        return;
      } else if (incomingMsg === '2') {
        sessionStore.update(user, { stage: 'completed' });
        reply = 'Thanks for your time! We hope to connect again soon. 🎉';
      } else {
        reply = 'Please reply with 1 (Yes) or 2 (No).';
      }
      break;

    case 'select':
      if (['1', '2', '3'].includes(incomingMsg)) {
        const hat = incomingMsg === '1' ? 'Wallet' : incomingMsg === '2' ? 'Sunglasses' : 'WaterBottle';
        const hatFormatted = hat.replace(/([A-Z])/g, ' $1').trim();

        sessionStore.update(user, {
          selectedHat: hat,
          stage: 'checkout',
          followupsSent: false
        });

        if (user !== FROM_NUMBER) {
          twilioClient.client.messages.create({
            from: FROM_NUMBER,
            to: user,
            mediaUrl: [`https://bot.jumpwire.xyz/hats/${hat.toLowerCase().replace(' ', '')}.jpg`],
            body: `✅ *Order Confirmed!*\n\nSwag: *${hatFormatted}*\nPrice: *$0*\nPickup: *Booth #12*\n\nShow this message at the booth to collect your swag! 🎉`
          }).catch(err => console.error('❌ Error sending swag confirmation image:', err));

          try {
            await twilioClient.sendFollowUpMessages(user);
          } catch (err) {
            console.error('❌ Error sending follow-ups:', err);
          }
        }

        reply = 'Your swag selection has been confirmed! 🎉';
      } else {
        reply = 'Please reply with 1, 2, or 3 to select your swag.';
      }
      break;

    case 'checkout':
      if (incomingMsg === '1' && session.allowHatChange) {
        sessionStore.update(user, { stage: 'select' });

        res.set('Content-Type', 'text/xml').send(
          twimlResponse('Sure! Let’s look at the swag again:\n1. Wallet\n2. Sunglasses\n3. Water Bottle')
        );
        sendSwagOptions(user);
        return;
      } else if (incomingMsg === '2') {
        sessionStore.resetSession(user);
        sessionStore.update(user, { stage: 'intro' });
        reply = 'Thanks for your visit! We hope you enjoy your swag. 🎁';
      } else {
        reply = 'Please reply with 1 to pick new swag, or 2 to end the chat.';
      }
      break;

    default:
      console.warn(`[WARN] Unrecognized stage or input: stage=${session.stage}, input=${incomingMsg}`);
      sessionStore.update(user, { stage: 'intro' });
      reply = "I'm not sure what you meant. Send 'reset' to start over.";
      break;
  }

  if (reply) {
    res.set('Content-Type', 'text/xml');
    res.send(twimlResponse(reply));
  }
});

module.exports = router;