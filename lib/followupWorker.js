const firestore = require('./firebase');
const admin = require('./firebase').admin;
const twilioClient = require('./twilioClient');


const FROM_NUMBER = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+15034214678';

async function checkAndSendFollowups() {
  const now = Date.now();

  try {
    const sessionsSnapshot = await firestore.collection('sessions').get();

    sessionsSnapshot.forEach(async (doc) => {
      const data = doc.data();
      const user = doc.id;

      if (!data) return;

      // Check 5-minute followup
      if (data.nextFollowup5m && now > data.nextFollowup5m && !data.followup5mSent) {
        await twilioClient.client.messages.create({
          from: FROM_NUMBER,
          to: user,
          body: 'Are you happy with your swag selection? Enter 1 for yes, enter 2 if you would like to exchange it.'
        });
        await firestore.collection('sessions').doc(user).update({ followup5mSent: true });
        console.log(`✅ Sent 5-min followup to ${user}`);
      }

      // Check 7-minute followup
      if (data.nextFollowup7m && now > data.nextFollowup7m && !data.followup7mSent) {
        await twilioClient.client.messages.create({
          from: FROM_NUMBER,
          to: user,
          body: '🌟 Learn more about Salesforce Marketing Cloud! Visit: https://invite.salesforce.com/salesforceconnectionsmetaprese'
        });
        await firestore.collection('sessions').doc(user).update({ followup7mSent: true });
        console.log(`✅ Sent 7-min followup to ${user}`);
      }
    });
  } catch (err) {
    console.error('❌ Error in followup worker:', err);
  }
}

// Run every 1 minute
setInterval(checkAndSendFollowups, 60 * 1000);

console.log('✅ Followup worker started.');