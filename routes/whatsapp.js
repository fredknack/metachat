const express = require('express');
const router = express.Router();
const sessionStore = require('../lib/sessionStore');
const { firestore, admin } = require('../lib/firebase');

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'JumpwireWhatsAppSecret9834';

async function logToFirestore(user, message, stage) {
  try {
    const sessionRef = firestore.collection('sessions').doc(user);

    await sessionRef.set({
      lastMessage: message,
      stage,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await sessionRef.collection('log').add({
      message,
      stage,
      timestamp: new Date()
    });

    console.log(`✅ Logged interaction for ${user} at stage: ${stage}`);
  } catch (err) {
    console.error(`❌ Failed to log to Firebase for ${user}:`, err);
  }
}

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
  const { From: from, Body } = req.body;
  const incomingMsg = Body?.trim().toLowerCase();

  if (!from || !incomingMsg) {
    console.warn(`⚠️ Invalid payload: From=${from}, Body=${incomingMsg}`);
    return res.status(400).send('Bad Request');
  }

  const user = from;
  const session = sessionStore.getOrCreateSession(user);
  console.log(`[DEBUG] User: ${user}, Incoming: ${incomingMsg}`);
  console.log(`[DEBUG] Current session:`, session);

  await logToFirestore(user, incomingMsg, session.stage);

  let reply = '';

  if (incomingMsg === 'start' || incomingMsg === 'reset') {
    sessionStore.resetSession(user);
    sessionStore.update(user, { stage: 'intro', followupsSent: false });
    return res.set('Content-Type', 'text/xml').send(
      twimlResponse(`👋 Welcome to CNX - Every connection is an opportunity. It's your world.\n\nDo you want to learn more?\n1. Yes\n2. No`)
    );
  }

  switch (session.stage) {
    case 'intro':
      if (incomingMsg === '1') {
        sessionStore.update(user, { stage: 'swag' });
        reply = 'Great! Let’s move on to swag options.\n1. Yes\n2. No';
      } else if (incomingMsg === '2') {
        sessionStore.update(user, { stage: 'skipToSwag' });
        reply = 'Want some swag?\n1. Yes\n2. No';
      } else {
        reply = 'Please reply with 1 (Yes) or 2 (No).';
      }
      break;

    case 'skipToSwag':
    case 'swag':
      if (incomingMsg === '1') {
        // User wants to pick swag → go to select
        sessionStore.update(user, { stage: 'select' });
        return res.set('Content-Type', 'text/xml').send(
          twimlResponse(
            'Pick your swag:\n1. Wallet\n2. Sunglasses\n3. Water Bottle',
            'https://metachat-production-e054.up.railway.app/static/swag/swag.jpg'
          )
        );
      } else if (incomingMsg === '2') {
        // User says no thanks
        sessionStore.update(user, { stage: 'finalthanks' });
        reply = 'Thanks again for your participation! If you want to learn more, visit: https://invite.salesforce.com/salesforceconnectionsmetaprese';
      } else {
        reply = 'Please reply with 1 (Yes) or 2 (No).';
      }
      break;

    case 'exchange':
      if (['1', '2', '3'].includes(incomingMsg)) {
        const hat = incomingMsg === '1' ? 'Wallet' : incomingMsg === '2' ? 'Sunglasses' : 'WaterBottle';
        const hatFormatted = hat.replace(/([A-Z])/g, ' $1').trim();

        sessionStore.update(user, {
          selectedHat: hat,
          stage: 'checkout'
        });

        console.log(`✅ Swag exchanged for ${user}, no new followups scheduled`);

        return res.set('Content-Type', 'text/xml').send(
          twimlResponse(
            `✅ *Exchange Confirmed!*\n\nNew Swag: *${hatFormatted}*\nPickup: *Booth #12*\n\nShow this message at the booth to collect your swag! 🎉\n\nEnter 1 when done, or 2 to exchange again.`,
            `https://metachat-production-e054.up.railway.app/static/swag/${hat.toLowerCase().replace(' ', '')}.jpg`
          )
        );
      } else {
        reply = 'Please reply with 1, 2, or 3 to select your new swag.';
      }
      break;

    case 'checkout':
      if (incomingMsg === '1') {
        sessionStore.update(user, { stage: 'finalthanks' });
        reply = 'Thanks again for your participation!\nIf you want to learn more, visit: https://invite.salesforce.com/salesforceconnectionsmetaprese';
      } else if (incomingMsg === '2') {
        sessionStore.update(user, { stage: 'exchange' });
        reply = 'Okay! Let’s exchange your swag.\nPlease reply:\n1. Wallet\n2. Sunglasses\n3. Water Bottle';
      } else {
        reply = 'Enter 1 when done, or 2 to exchange your swag.';
      }
      break;

    case 'finalthanks':
      reply = 'Thank you again! You can always type "reset" to start over or "start" to explore again.';
      break;

    default:
      sessionStore.update(user, { stage: 'intro' });
      reply = "I'm not sure what you meant. Send 'reset' to start over.";
      break;
  }

  if (reply) {
    res.set('Content-Type', 'text/xml').send(twimlResponse(reply));
  }
});

module.exports = router;