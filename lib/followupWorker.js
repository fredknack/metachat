require('dotenv').config();
const { firestore } = require('./firebase');
const sessionStore = require('./sessionStore');
const twilioClient = require('./twilioClient');

const FROM_NUMBER = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+15034214678';

async function checkAndSendFollowups() {
  const now = Date.now();

  try {
    const sessionsSnapshot = await firestore.collection('sessions').get();

    for (const doc of sessionsSnapshot.docs) {
      const data = doc.data();
      const user = doc.id;

      if (!data) continue;

      const localSession = sessionStore.getOrCreateSession(user);

      // 5-minute followup
      if (data.nextFollowup5m && now > data.nextFollowup5m && !data.followup5mSent) {
        // Only proceed if session is still at checkout
        if (data.stage === 'checkout') {
          try {
            await twilioClient.client.messages.create({
              from: FROM_NUMBER,
              to: user,
              body: 'Are you happy with your swag selection? Enter 1 for yes, enter 2 if you would like to exchange it.'
            });

            await firestore.collection('sessions').doc(user).update({
              followup5mSent: true,
              stage: 'exchange'
            });

            // ✅ Update local session store safely
            localSession.stage = 'exchange';
            sessionStore.update(user, localSession);

            console.log(`✅ Sent 5-min followup + moved ${user} to exchange stage`);
          } catch (err) {
            console.error(`❌ Failed 5-min followup to ${user}:`, err);
          }
        } else {
          console.log(`ℹ️ Skipped 5-min followup for ${user} (current stage: ${data.stage})`);
        }
      }

      // 7-minute followup
      if (data.nextFollowup7m && now > data.nextFollowup7m && !data.followup7mSent) {
        try {
          await twilioClient.client.messages.create({
            from: FROM_NUMBER,
            to: user,
            body: '🌟 Learn more about Salesforce Marketing Cloud! Visit: https://invite.salesforce.com/salesforceconnectionsmetaprese'
          });
          await firestore.collection('sessions').doc(user).update({ followup7mSent: true });
          console.log(`✅ Sent 7-min followup to ${user}`);
        } catch (err) {
          console.error(`❌ Failed 7-min followup to ${user}:`, err);
        }
      }
    }
  } catch (err) {
    console.error('❌ Error in followup worker loop:', err);
  }
}

// Run every 1 minute
setInterval(() => {
  checkAndSendFollowups().catch((err) => {
    console.error('❌ Unhandled error in followupWorker:', err);
  });
}, 60 * 1000);

console.log('✅ Followup worker started.');