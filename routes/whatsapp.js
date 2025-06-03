// FULL UPDATED whatsapp.js WITH FIXED EXCHANGE LOGIC

const express = require('express');
const router = express.Router();
const sessionStore = require('../lib/sessionStore');
const { firestore, admin } = require('../lib/firebase');

const FROM_NUMBER = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+15034214678';
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'JumpwireWhatsAppSecret9834';

const swagImageMap = {
  Wallet: 'wallet.jpg',
  Sunglasses: 'sunglasses.jpg',
  WaterBottle: 'bottle.jpg'
};

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
  session.pathHistory = session.pathHistory || [];
  session.exchangeCount = session.exchangeCount || 0;
  session.initialHat = session.initialHat || null;
  session.finalHat = session.finalHat || null;
  session.exchangeOffered = session.exchangeOffered || false;

  console.log(`[DEBUG] User: ${user}, Incoming: ${incomingMsg}`);
  console.log(`[DEBUG] Current session for ${user}:`, session);

  await logToFirestore(user, incomingMsg, session.stage);

  let reply = '';

  if (
    incomingMsg === 'start' ||
    incomingMsg === 'reset' ||
    incomingMsg === "let's connect!" ||
    incomingMsg === "lets connect!"
  ) {
    const userDoc = await firestore.collection('sessions').doc(user).get();

    if (!userDoc.exists || !userDoc.data().initialHat) {
      // Treat as a new user if no record OR no initialHat set
      sessionStore.resetSession(user);
      sessionStore.update(user, {
        stage: 'intro',
        followupsSent: false,
        pathHistory: ['intro'],
        exchangeCount: 0,
        initialHat: null,
        finalHat: null,
        exchangeOffered: false
      });

      return res.set('Content-Type', 'text/xml').send(
        twimlResponse(`👋 Hi! Welcome to Connections! Ready to see how Meta and Salesforce can help you shape the future of customer engagement? Every connection is an opportunity. It’s Your World. Let’s get started! 🚀

    Interested in learning more about the Salesforce and Meta partnership? 🤝
    Reply 1 for Yes
    2 for No`)
      );
    } else {
      const userData = userDoc.data();

      if (userData.exchangeCount === 0) {
        sessionStore.update(user, {
          stage: 'exchange',
          exchangeOffered: false,
          pathHistory: session.pathHistory.concat(['exchange'])
        });

        return res.set('Content-Type', 'text/xml').send(
          twimlResponse('Are you happy with your swag choice? Reply 1 if you’re happy, or 2 if you want to exchange it.')
        );
      } else {
        sessionStore.update(user, {
          stage: 'finalthanks',
          pathHistory: session.pathHistory.concat(['finalthanks'])
        });

        return res.set('Content-Type', 'text/xml').send(
          twimlResponse('Thanks again for your participation! 🎉')
        );
      }
    }
  }

  switch (session.stage) {
    case 'intro':
      session.pathHistory.push('intro');
      if (incomingMsg === '1') {
        session.pathHistory.push('swag');
        sessionStore.update(user, { stage: 'swag', pathHistory: session.pathHistory });
        reply = `Meta and Salesforce are teaming up to enhance customer engagement and marketing performance through WhatsApp and Conversions API.

Learn more on our partnerships page:
https://www.salesforce.com/partners/meta-whatsapp/
Then, return here for some swag!

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

      if (!session.exchangeOffered) {
        if (incomingMsg === '1') {
          session.pathHistory.push('finalthanks');
          sessionStore.update(user, { stage: 'finalthanks', pathHistory: session.pathHistory });
          reply = 'Thanks again for your participation! 🎉 If you want to learn more, visit: https://invite.salesforce.com/salesforceconnectionsmetaprese';
        } else if (incomingMsg === '2') {
          session.exchangeOffered = true;
          sessionStore.update(user, { exchangeOffered: true });
          reply = 'Please select the new swag you want:\n1. Wallet\n2. Sunglasses\n3. Water Bottle';
        } else {
          reply = 'Please reply with 1 if you’re happy, or 2 if you want to exchange your swag.';
        }
      } else if (['1', '2', '3'].includes(incomingMsg)) {
        const hat = incomingMsg === '1' ? 'Wallet' : incomingMsg === '2' ? 'Sunglasses' : 'WaterBottle';
        const hatFormatted = hat.replace(/([A-Z])/g, ' $1').trim();
        const imageFilename = swagImageMap[hat];

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

        await firestore.collection('sessions').doc(user).set({
          exchangeCount: session.exchangeCount,
          finalHat: session.finalHat,
          pathHistory: session.pathHistory
        }, { merge: true });

        console.log(`✅ Swag exchanged + tracking updated for ${user}`);

        return res.set('Content-Type', 'text/xml').send(
          twimlResponse(
            `✅ *Exchange Confirmed!*\n\nNew Swag: *${hatFormatted}*\nPickup: *Booth #12*\n\nShow this message at the booth to collect your new swag! 🎉\n\nEnter 1 when you’re done.`,
            `https://metachat-production-e054.up.railway.app/static/swag/${imageFilename}`
          )
        );
      } else {
        reply = 'Please select the new swag you want:\n1. Wallet\n2. Sunglasses\n3. Water Bottle';
      }
      break;

    case 'select':
      if (['1', '2', '3'].includes(incomingMsg)) {
        const hat = incomingMsg === '1' ? 'Wallet' : incomingMsg === '2' ? 'Sunglasses' : 'WaterBottle';
        const hatFormatted = hat.replace(/([A-Z])/g, ' $1').trim();
        const imageFilename = swagImageMap[hat];

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

        await firestore.collection('sessions').doc(user).set({
          nextFollowup3h: Date.now() + 3 * 60 * 60 * 1000,
          nextFollowup23h: Date.now() + 23 * 60 * 60 * 1000,
          followup3hSent: false,
          followup23hSent: false,
          initialHat: session.initialHat,
          finalHat: session.finalHat,
          exchangeCount: session.exchangeCount,
          pathHistory: session.pathHistory
        }, { merge: true });

        console.log(`✅ Updated Firestore followups + tracking for ${user}`);

        return res.set('Content-Type', 'text/xml').send(
          twimlResponse(
            `✅ *Order Confirmed!*\n\nSwag: *${hatFormatted}*\nPrice: *$0*\nPickup: *Booth #12*\n\nShow this message at the booth to collect your swag! 🎉\n\nEnter 1 when you’re done.`,
            `https://metachat-production-e054.up.railway.app/static/swag/${imageFilename}`
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
        reply = 'Thanks for your participation!';
      } else if (incomingMsg === '2') {
        session.pathHistory.push('exchange');
        sessionStore.update(user, { stage: 'exchange', exchangeOffered: false, pathHistory: session.pathHistory });
        reply = 'Are you happy with your swag choice? Reply 1 if you’re happy, or 2 if you want to exchange it.';
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