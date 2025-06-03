require('dotenv').config();
const { firestore } = require('./firebase');
const sessionStore = require('./sessionStore');
const twilioClient = require('./twilioClient');

const FROM_NUMBER = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+15034214678';

// 🔁 Run every 60 seconds
setInterval(() => {
  checkAndSendFollowups().catch((err) => {
    console.error('❌ Unhandled error in followupWorker:', err);
  });
}, 60 * 1000);

console.log('✅ Followup worker started.');

async function checkAndSendFollowups() {
  const now = Date.now();
  console.log(`[⏱️ Loop] Checking sessions at ${new Date(now).toLocaleString()}`);

  try {
    const sessionsSnapshot = await firestore.collection('sessions').get();

    for (const doc of sessionsSnapshot.docs) {
      const data = doc.data();
      const user = doc.id;

      if (!data) continue;

      const localSession = sessionStore.getOrCreateSession(user);

      // 🚧 FORCED TEST (optional, remove for production)
      // if (user === 'whatsapp:+11234567890') {
      //   data.nextFollowup3h = now - 1000;
      //   data.followup3hSent = false;
      //   data.stage = 'checkout';
      // }

      // 🕒 3-hour followup
      if (data.nextFollowup3h && now > data.nextFollowup3h && !data.followup3hSent) {
        console.log(`[DEBUG] 3h condition met for ${user}`);

        if (data.stage === 'checkout') {
          try {
            const message = await twilioClient.client.messages.create({
              from: FROM_NUMBER,
              to: user,
              body: `Thanks for stopping by the Meta booth! If you'd like to learn more about our partnership with Meta, complete this form to express your interest to receive more resources.\nhttps://invite.salesforce.com/salesforceconnectionsmetaprese#g-108497786`
            });

            console.log(`✅ Twilio 3h message sent to ${user}: SID=${message.sid}`);

            await firestore.collection('sessions').doc(user).update({
              followup3hSent: true,
              stage: 'exchange'
            });

            localSession.stage = 'exchange';
            sessionStore.update(user, localSession);

            console.log(`✅ Sent 3-hour followup + moved ${user} to exchange stage`);
          } catch (err) {
            console.error(`❌ Failed 3-hour followup to ${user}:`, err);
          }
        } else {
          console.log(`ℹ️ Skipped 3-hour followup for ${user} (stage: ${data.stage})`);
        }
      }

      // 🕐 23-hour followup
      if (data.nextFollowup23h && now > data.nextFollowup23h && !data.followup23hSent) {
        try {
          const message = await twilioClient.client.messages.create({
            from: FROM_NUMBER,
            to: user,
            body: `Thank you for attending Connections and stopping by the Meta booth! Do you have a couple of minutes to answer the questions below to inform Meta’s marketing and content for businesses? Our survey is short and we value your opinion.\n\nWe may use your data for personalization, innovation, research and other purposes described in our Privacy Policy:\nhttps://facebook.com/privacy/policy\n\nClick to launch the survey.\nhttps://facebook.com/privacy/policy`
          });

          console.log(`✅ Twilio 23h message sent to ${user}: SID=${message.sid}`);

          await firestore.collection('sessions').doc(user).update({
            followup23hSent: true
          });

          console.log(`✅ Sent 23-hour followup to ${user}`);
        } catch (err) {
          console.error(`❌ Failed 23-hour followup to ${user}:`, err);
        }
      }
    }
  } catch (err) {
    console.error('❌ Error in followup worker loop:', err);
  }
}