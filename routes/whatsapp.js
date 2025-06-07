// FULL UPDATED whatsapp.js WITH scheduleSwagPrompt() TRIGGERED

const express = require('express');
const router = express.Router();
const sessionStore = require('../lib/sessionStore');
const { firestore, admin } = require('../lib/firebase');
const twilioClient = require('../lib/twilioClient');

const FROM_NUMBER = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+15034214678';
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'JumpwireWhatsAppSecret9834';

const swagImageMap = {
  Wallet: 'wallet.jpg',
  Sunglasses: 'sunglasses.jpg',
  WaterBottle: 'bottle.jpg'
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function syncSessionToFirestore(user, session, extraFields = {}) {
  const sessionRef = firestore.collection('sessions').doc(user);
  const payload = {
    exchangeCount: session.exchangeCount,
    finalHat: session.finalHat,
    initialHat: session.initialHat,
    stage: session.stage,
    pathHistory: session.pathHistory,
    exchangeOffered: session.exchangeOffered,
    ...extraFields
  };

  try {
    await sessionRef.set(payload, { merge: true });
    console.log(`🔄 Synced session to Firestore for ${user}`);
  } catch (err) {
    console.error(`❌ Failed to sync session to Firestore for ${user}:`, err);
  }
}

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

function scheduleSwagPrompt(user, delayMs = 10000) {
  console.log(`⏳ Scheduling swag prompt for ${user} in ${delayMs}ms`);

  setTimeout(async () => {
    try {
      console.log(`🚀 Attempting to send swag prompt to ${user}`);

      const sessionRef = firestore.collection('sessions').doc(user);
      const sessionSnap = await sessionRef.get();
      const data = sessionSnap.data();

      if (!data || data.stage !== 'swag') {
        console.log(`⛔️ Not sending swag prompt. Stage is ${data?.stage}`);
        return;
      }

      await twilioClient.client.messages.create({
        from: FROM_NUMBER,
        to: user,
        body: `Hope you enjoyed that sneak peek of our partnership with Salesforce! 

Let’s make your Connections experience unforgettable with some awesome swag on us! 

Interested? 🛍️

Reply:
1 for Yes
2 for No`
      });

      console.log(`✅ Sent delayed swag prompt to ${user}`);
    } catch (err) {
      console.error(`❌ Failed to send delayed swag prompt to ${user}:`, err);
    }
  }, delayMs);
}

function scheduleSwagConfirmation(user, delayMs = 20000) {
  setTimeout(async () => {
    try {
      const sessionRef = firestore.collection('sessions').doc(user);
      const statsRef = firestore.collection('meta').doc('stats');
      const sessionSnap = await sessionRef.get();
      const data = sessionSnap.data();

      if (!data || data.swagConfirmSent) return;

      const imageFilename = swagImageMap[data.finalHat] || 'swag.jpg';

      // First message: order confirmation + image
      await twilioClient.client.messages.create({
        from: FROM_NUMBER,
        to: user,
        body: `✅ Great News...Your order is ready for pickup! Be sure to show this message along with your badge to pick it up.`,
        mediaUrl: [`https://metachat-production-e054.up.railway.app/static/swag/${imageFilename}`]
      });

      // ⏳ Wait 10 seconds before sending the second message
      setTimeout(async () => {
        try {
          await twilioClient.client.messages.create({
            from: FROM_NUMBER,
            to: user,
            body: `Thanks for stopping by today!
            
We hope you enjoyed the preview of some of the great experiences you can drive with your own customers using the WhatsApp integration on Salesforce.

And, don’t forget to register here for our upcoming sessions at CNX!

https://reg.salesforce.com/flow/plus/cnx25/sponsors/page/sponsorlisting/exhibitor/1662737052819001I1FZ`
          });

          await sessionRef.update({ swagConfirmSent: true });
          console.log(`✅ [Immediate] Sent swag confirm to ${user}`);
        } catch (innerErr) {
          console.error(`❌ [Second Message] Failed swag confirm for ${user}:`, innerErr);
        }
      }, 10000); // 10-second delay for second message

    } catch (err) {
      console.error(`❌ [Immediate] Failed swag confirm for ${user}:`, err);
    }
  }, delayMs);
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
    incomingMsg === 'Reset' ||
    incomingMsg === "let's connect!" ||
    incomingMsg === "lets connect!"
  ) {
    // If reset, delete Firestore record
    if (incomingMsg === 'reset') {
      try {
        await firestore.collection('sessions').doc(user).delete();
        console.log(`✅ Deleted Firestore session record for ${user}`);
      } catch (err) {
        console.error(`❌ Failed to delete Firestore session record for ${user}:`, err);
      }
    }

    const statsRef = firestore.collection('meta').doc('stats');
    await statsRef.update({
      totalInteractions: admin.firestore.FieldValue.increment(1)
    });

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
        twimlResponse(`👋 Hi! Welcome to Connections!
  
Ready to see how Meta and Salesforce can help you shape the future of customer engagement?
  
Every connection is an opportunity. It’s Your World. Let’s get started! 🚀

To learn more about the Salesforce and Meta partnership 🤝

Reply 

1 for Learn more
2 for No thank you`)
      );
    } else {
      const userData = userDoc.data();
      console.log(`[DEBUG] Firestore exchangeCount for ${user}:`, userData.exchangeCount);
      if (typeof userData.exchangeCount === 'number' && userData.exchangeCount < 1) {
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
        
        await firestore.collection('sessions').doc(user).set({
          stage: 'swag'
        }, { merge: true });

        // Increment learnMoreClicks
        await firestore.collection('meta').doc('stats').update({
          learnMoreClicks: admin.firestore.FieldValue.increment(1)
        });
        
        scheduleSwagPrompt(user); 
        reply = `Meta and Salesforce are teaming up to enhance customer engagement and marketing performance through WhatsApp and Conversions API.

Check out our partnerships page to learn more  and come back for a chance to select some amazing swag!
https://www.salesforce.com/partners/meta-whatsapp/`;
      } else if (incomingMsg === '2') {
        session.pathHistory.push('skipToSwag');
        sessionStore.update(user, { stage: 'skipToSwag', pathHistory: session.pathHistory });
        reply = `That's okay, you can come back anytime.

Everything you've just experienced is available natively on Salesforce.

Check out our partnerships page to learn more!

https://www.salesforce.com/partners/meta-whatsapp/

Want some swag?
1 for Yes
2 for No`;
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
            'Swag on! Pick your favorite!\n\nRelpy:\n1 for Wallet\n2 for Sunglasses\n3 for Water Bottle',
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
          await syncSessionToFirestore(user, session);
          reply = 'Thanks again for your participation! 🎉 If you want to learn more, visit: https://invite.salesforce.com/salesforceconnectionsmetaprese';
        } else if (incomingMsg === '2') {
          session.exchangeOffered = true;
          sessionStore.update(user, { exchangeOffered: true });
          reply = 'Please select the new swag you want:\n1 for Wallet\n2 for Sunglasses\n3 for Water Bottle';
        } else {
          reply = 'Please reply with 1 if you’re happy, or 2 if you want to exchange your swag.';
        }
      } else if (['1', '2', '3'].includes(incomingMsg)) {
        const hat = incomingMsg === '1' ? 'Wallet' : incomingMsg === '2' ? 'Sunglasses' : 'WaterBottle';
        const hatFormatted = hat.replace(/([A-Z])/g, ' $1').trim();
        const imageFilename = swagImageMap[hat];

        // ✅ Safely increment and cap exchangeCount at 2
        if (typeof session.exchangeCount === 'number') {
          session.exchangeCount = session.exchangeCount === 1 ? 2 : 1;
        } else {
          session.exchangeCount = 1;
        }

        session.finalHat = hat;
        session.pathHistory.push('checkout');
        session.stage = 'checkout';
        session.exchangeOffered = false;

        sessionStore.update(user, {
          selectedHat: hat,
          stage: session.stage,
          exchangeCount: session.exchangeCount,
          finalHat: session.finalHat,
          exchangeOffered: false,
          pathHistory: session.pathHistory
        });

        // ✅ Write directly to Firestore
        const sessionRef = firestore.collection('sessions').doc(user);
        const sessionPayload = {
          exchangeCount: session.exchangeCount,
          finalHat: session.finalHat,
          initialHat: session.initialHat,
          stage: session.stage,
          pathHistory: session.pathHistory,
          exchangeOffered: session.exchangeOffered
        };
        await sessionRef.set(sessionPayload, { merge: true });
        console.log(`[SYNC] Wrote to Firestore for ${user}:`, sessionPayload);

        // 🔍 Optional: verify the write
        const verifySnap = await sessionRef.get();
        console.log(`[VERIFY WRITE] Firestore exchangeCount after update:`, verifySnap.data().exchangeCount);

        // 📊 Stats
        const statsRef = firestore.collection('meta').doc('stats');
        const swagFieldMap = {
          wallet: 'walletTotal',
          sunglasses: 'sunglassesTotal',
          waterbottle: 'waterBottleTotal'
        };
        const oldHatKey = session.initialHat?.toLowerCase();
        const newHatKey = hat.toLowerCase();

        const updates = {};
        if (oldHatKey && swagFieldMap[oldHatKey]) {
          updates[swagFieldMap[oldHatKey]] = admin.firestore.FieldValue.increment(-1);
        }
        if (swagFieldMap[newHatKey]) {
          updates[swagFieldMap[newHatKey]] = admin.firestore.FieldValue.increment(1);
        }

        await statsRef.update(updates);
        console.log(`📊 Updated stats: -1 ${oldHatKey}, +1 ${newHatKey}`);

        return res.set('Content-Type', 'text/xml').send(
          twimlResponse(
            `✅ *Exchange Confirmed!*\n\nNew Swag: *${hatFormatted}*\nPickup: *Booth #2*\n\nShow this message at the booth to collect your new swag! 🎉`,
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

        // ✅ Important: Set the followup + delayed swag confirmation timestamps
        const now = Date.now();
        await firestore.collection('sessions').doc(user).set({
          nextSwagConfirm: now + 90 * 1000, // 1.5 minutes from now
          swagConfirmSent: false,
          nextFollowup3h: now + 3 * 60 * 60 * 1000,
          nextFollowup23h: now + 23 * 60 * 60 * 1000,
          followup3hSent: false,
          followup23hSent: false,
          initialHat: session.initialHat,
          finalHat: session.finalHat,
          exchangeCount: session.exchangeCount,
          pathHistory: session.pathHistory
        }, { merge: true });

        console.log(`✅ Scheduled swagConfirm + followups for ${user}`);

        const statsRef = firestore.collection('meta').doc('stats');

        // Get selected hat (e.g. from session.finalHat)
        const selectedHat = session.finalHat?.toLowerCase();
        const swagFieldMap = {
          wallet: 'walletTotal',
          sunglasses: 'sunglassesTotal',
          waterbottle: 'waterBottleTotal'
        };
        const field = swagFieldMap[selectedHat];

        if (field) {
          const update = {
            [field]: admin.firestore.FieldValue.increment(1),
            totalOrders: admin.firestore.FieldValue.increment(1)
          };
          await statsRef.update(update);
          console.log(`📊 Updated stats for ${selectedHat}`);
        } else {
          console.warn(`⚠️ No matching swag field found for: ${selectedHat}`);
        }

        scheduleSwagConfirmation(user, 20000); // ✅ trigger in-process swag confirm

        // ✅ Send immediate fun messages
        await twilioClient.client.messages.create({
          from: FROM_NUMBER,
          to: user,
          body: 'Great choice! Your swag is on its way—perfect for your stay in the Windy City! 💨'
        });

        // 🆕 Split into 4 messages with 3-second delays
        await twilioClient.client.messages.create({
          from: FROM_NUMBER,
          to: user,
          body: "While you wait, check out these cool facts about Meta's Business Messaging solution:"
        });

        await sleep(4000);

        await twilioClient.client.messages.create({
          from: FROM_NUMBER,
          to: user,
          mediaUrl: ['https://metachat-production-e054.up.railway.app/static/swag/banner-1.jpg']
        });

        await sleep(4000);

        await twilioClient.client.messages.create({
          from: FROM_NUMBER,
          to: user,
          mediaUrl: ['https://metachat-production-e054.up.railway.app/static/swag/banner-2.jpg']
        });

        await sleep(4000);

        await twilioClient.client.messages.create({
          from: FROM_NUMBER,
          to: user,
          mediaUrl: ['https://metachat-production-e054.up.railway.app/static/swag/banner-3.jpg']
        });

        // Do NOT send swag image yet — let the followupWorker do it
        return res.set('Content-Type', 'text/xml').send('<Response></Response>');
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
        await syncSessionToFirestore(user, session);
        reply = 'Are you happy with your swag choice? Reply 1 if you’re happy, or 2 if you want to exchange it.';
      } else {
        reply = 'Please enter 2 if you want to exchange your swag.';
      }
      break;

    case 'finalthanks':
      reply = 'Thank you again!';
      break;

    default:
      console.warn(`[WARN] Unrecognized stage or input: stage=${session.stage}, input=${incomingMsg}`);
      sessionStore.update(user, { stage: 'intro' });
      reply = `Thank you for connecting with us. Meta and Salesforce are teaming up to enhance customer engagement and marketing performance through WhatsApp and Conversions API. '
      
  Check out our partnerships page to learn more!

  https://invite.salesforce.com/salesforceconnectionsmetaprese#g-108497786`
      break;
  }

  if (reply) {
    res.set('Content-Type', 'text/xml');
    res.send(twimlResponse(reply));
  }
});

module.exports = router;