// routes/whatsapp.js
const express = require('express');
const router = express.Router();
const twilioClient = require('../lib/twilioClient');
const sessionStore = require('../lib/sessionStore');

const FROM_NUMBER = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+15034214678';
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'JumpwireWhatsAppSecret9834';

function twimlResponse(message, mediaUrl = null) {
  if (mediaUrl) {
    return `
      <Response>
        <Message>
          ${message}
          <Media>${mediaUrl}</Media>
        </Message>
      </Response>
    `;
  } else {
    return `<Response><Message>${message}</Message></Response>`;
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
  console.log('🔥 Incoming POST /whatsapp');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);

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
    sessionStore.update(user, { stage: 'intro', followupsSent: false });

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

        return res.set('Content-Type', 'text/xml').send(
          twimlResponse(
            'Pick your swag:\n1. Wallet\n2. Sunglasses\n3. Water Bottle',
            'https://metachat-production-e054.up.railway.app/static/swag/swag.jpg'
          )
        );
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

        await twilioClient.sendFollowUpMessages(user);

        return res.set('Content-Type', 'text/xml').send(
          twimlResponse(
            `✅ *Order Confirmed!*\n\nSwag: *${hatFormatted}*\nPrice: *$0*\nPickup: *Booth #12*\n\nShow this message at the booth to collect your swag! 🎉\n\nEnter 1 when you’re done.`,
            `https://metachat-production-e054.up.railway.app/static/swag/${hat.toLowerCase().replace(' ', '')}.jpg`
          )
        );
      } else {
        reply = 'Please reply with 1, 2, or 3 to select your swag.';
      }
      break;

    case 'checkout':
      if (incomingMsg === '1') {
        sessionStore.update(user, { stage: 'finalthanks' });
        reply = 'We are glad that you are happy with your selection. Thanks again for your participation!\nIf you want to learn more, visit: https://invite.salesforce.com/salesforceconnectionsmetaprese';
      } else {
        reply = 'Please enter 1 when you’re done at the booth.';
      }
      break;

    case 'finalthanks':
      reply = 'Thank you again! You can always type "reset" to start over or "start" to explore again.';
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