require('dotenv').config();
const { firestore } = require('./firebase');
const sessionStore = require('./sessionStore');
const twilioClient = require('./twilioClient');

// ✅ Swag image filename map
const swagImageMap = {
  Wallet: 'wallet.jpg',
  Sunglasses: 'sunglasses.jpg',
  WaterBottle: 'bottle.jpg'
};

const FROM_NUMBER = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+15034214678';

// 🔁 Check every 30 seconds
setInterval(() => {
  checkAndSendFollowups().catch((err) => {
    console.error('❌ Unhandled error in followupWorker:', err);
  });
}, 30 * 1000);

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

      // 🎁 Swag confirmation
      if (
        typeof data.nextSwagConfirm === 'number' &&
        now > data.nextSwagConfirm &&
        !data.swagConfirmSent
      ) {
        console.log(`🕓 Swag confirm eligible for ${user} (now=${now}, target=${data.nextSwagConfirm})`);
        try {
          const imageFilename = swagImageMap[data.finalHat] || 'swag.jpg';

          await twilioClient.client.messages.create({
            from: FROM_NUMBER,
            to: user,
            body: `✅ Your order is ready! Be sure to show this message along with your badge to pick it up.\n\n`,
            mediaUrl: [`https://metachat-production-e054.up.railway.app/static/swag/${imageFilename}`]
          });

          // Second message: additional info and link
          await twilioClient.client.messages.create({
            from: FROM_NUMBER,
            to: user,
            body: `Thanks for stopping by today!

We hope you enjoyed this preview of some of the great experiences you can drive with your own customers using the WhatsApp integrations on Salesforce.

Don’t forget to register for our upcoming sessions at CNX here.

https://invite.salesforce.com/salesforceconnectionsmetaprese#g-108497786`
          });

          await firestore.collection('sessions').doc(user).update({
            swagConfirmSent: true
          });

          console.log(`✅ Sent swag confirm image to ${user}`);
        } catch (err) {
          console.error(`❌ Failed swag confirm for ${user}:`, err);
        }
      }

      // 🕒 3-hour followup
      if (
        typeof data.nextFollowup3h === 'number' &&
        now > data.nextFollowup3h &&
        !data.followup3hSent
      ) {
        console.log(`🕒 3-hour followup eligible for ${user}`);
        try {
          await twilioClient.client.messages.create({
            from: FROM_NUMBER,
            to: user,
            body: `Thanks for stopping by the Meta booth! If you'd like to learn more about our partnership with Salesforce, complete this form to get in touch. 

https://invite.salesforce.com/salesforceconnectionsmetaprese#g-108497786`
          });

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
      }

      // 🕐 23-hour followup
      if (
        typeof data.nextFollowup23h === 'number' &&
        now > data.nextFollowup23h &&
        !data.followup23hSent
      ) {
        console.log(`🕐 23-hour followup eligible for ${user}`);
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