const express = require('express');
const router = express.Router();
const sessionStore = require('../lib/sessionStore');
const { firestore, admin } = require('../lib/firebase');

const FROM_NUMBER = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+15034214678';
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

  // Initialize tracking fields if missing
  session.pathHistory = session.pathHistory || [];
  session.exchangeCount = session.exchangeCount || 0;
  session.initialHat = session.initialHat || null;
  session.finalHat = session.finalHat || null;

  console.log(`[DEBUG] User: ${user}, Incoming: ${incomingMsg}`);
  console.log(`[DEBUG] Current session for ${user}:`, session);

  await logToFirestore(user, incomingMsg, session.stage);

  let reply = '';

  if (incomingMsg === 'start' || incomingMsg === 'reset') {
    sessionStore.resetSession(user);
    sessionStore.update(user, {
      stage: 'intro',
      followupsSent: false,
      pathHistory: ['intro'],
      exchangeCount: 0,
      initialHat: null,
      finalHat: null
    });

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
      session.pathHistory.push('intro');
      if (incomingMsg === '1') {
        session.pathHistory.push('swag');
        sessionStore.update(user, { stage: 'swag', pathHistory: session.pathHistory });
        reply = `Thanks for your interest! 🌟 Learn more about how Meta and Salesforce help businesses:
https://invite.salesforce.com/salesforceconnectionsmetaprese

Want some swag?
1. Yes
2. No`;
      } else if (incomingMsg === '2') {
        session.pathHistory.push('skipToSwag');
        sessionStore.update(user, { stage: 'skipToSwag', pathHistory: session.pathHistory });
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
      session.pathHistory.push('swag');
      if (incomingMsg === '1') {
        session.pathHistory.push('select');
        sessionStore.update(user, { stage: 'select', pathHistory: session.pathHistory });

        return res.set('Content-Type', 'text/xml').send(
          twimlResponse(
            'Pick your swag:\n1. Wallet\n2. Sunglasses\n3. Water Bottle',
            'https://metachat-production-e054.up.railway.app/static/swag/swag.jpg'
          )
        );
      } else if (incomingMsg === '2') {
        session.pathHistory.push('completed');
        sessionStore.update(user, { stage: 'completed', pathHistory: session.pathHistory });
        reply = 'Thanks for your time! We hope to connect again soon. 🎉';
      } else {
        reply = 'Please reply with 1 (Yes) or 2 (No).';
      }
      break;

    case 'exchange':
      console.log(`[DEBUG] Exchange mode input received: ${incomingMsg}`);

      if (session.exchangeOffered !== true) {
        sessionStore.update(user, { exchangeOffered: true });
        reply = 'Please select the new swag you want:\n1. Wallet\n2. Sunglasses\n3. Water Bottle';
      }
      else if (['1', '2', '3'].includes(incomingMsg)) {
        const hat = incomingMsg === '1' ? 'Wallet' : incomingMsg === '2' ? 'Sunglasses' : 'WaterBottle';
        const hatFormatted = hat.replace(/([A-Z])/g, ' $1').trim();

        session.exchangeCount += 1;
        session.finalHat = hat;
        session.pathHistory.push('checkout');

        sessionStore.update(user, {
          selectedHat: hat,
          stage: 'checkout',
          exchangeCount: session.exchangeCount,
          finalHat: session.finalHat,
          exchangeOffered: false,
          pathHistory: session.pathHistory
        });

        console.log(`✅ Swag exchanged for ${user}, no new followups scheduled`);

        return res.set('Content-Type', 'text/xml').send(
          twimlResponse(
            `✅ *Exchange Confirmed!*\n\nNew Swag: *${hatFormatted}*\nPickup: *Booth #12*\n\nShow this message at the booth to collect your new swag! 🎉\n\nEnter 1 when you’re done.`,
            `https://metachat-production-e054.up.railway.app/static/swag/${hat.toLowerCase().replace(' ', '')}.jpg`
          )
        );
      } else {
        reply = 'Please reply with 1 (Wallet), 2 (Sunglasses), or 3 (Water Bottle) to exchange your swag.';
      }
      break;

    case 'select':
      if (['1', '2', '3'].includes(incomingMsg)) {
        const hat = incomingMsg === '1' ? 'Wallet' : incomingMsg === '2' ? 'Sunglasses' : 'WaterBottle';
        const hatFormatted = hat.replace(/([A-Z])/g, ' $1').trim();

        if (!session.initialHat) {
          session.initialHat = hat;
        }
        session.finalHat = hat;
        session.pathHistory.push('checkout');

        sessionStore.update(user, {
          selectedHat: hat,
          stage: 'checkout',
          initialHat: session.initialHat,
          finalHat: session.finalHat,
          pathHistory: session.pathHistory
        });

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
        session.pathHistory.push('finalthanks');
        sessionStore.update(user, { stage: 'finalthanks', pathHistory: session.pathHistory });
        reply = 'Thanks again for your participation!\nIf you want to learn more, visit: https://invite.salesforce.com/salesforceconnectionsmetaprese';
      } else if (incomingMsg === '2') {
        session.pathHistory.push('exchange');
        sessionStore.update(user, { stage: 'exchange', pathHistory: session.pathHistory });
        reply = 'Okay! Let’s exchange your swag. Please reply:\n1. Wallet\n2. Sunglasses\n3. Water Bottle';
      } else {
        reply = 'Please enter 1 when you’re done at the booth, or 2 if you want to exchange your swag.';
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