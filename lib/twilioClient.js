// twilioClient.js

const twilio = require('twilio');
const sessions = require('./sessionStore');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function sendFollowUpMessages(user) {
  try {
    if (!user) {
      console.error(`❌ Invalid user: ${user}`);
      return;
    }

    const session = sessionStore.getOrCreateSession(user);
    if (!session) {
      console.error(`❌ Session creation failed for user: ${user}`);
      return;
    }

    console.log(`🔑 Session keys: ${Object.keys(session)}`);

    if (session.followupsSent) {
      console.log(`ℹ️ Follow-ups already sent for ${user}`);
      return;
    }

    sessionStore.update(user, { followupsSent: true });

    const from = 'whatsapp:+14155238886';
    await Promise.all([
      client.messages.create({
        from,
        to: user,
        body: 'Thank you for your swag selection! 🎁'
      }),
      client.messages.create({
        from,
        to: user,
        body: 'We will notify you when your swag is shipped. 🚚'
      })
    ]);
    console.log(`✅ Follow-up messages sent to ${user}`);
  } catch (error) {
    console.error(`❌ Error sending follow-up messages to ${user}:`, error);
  }
}

module.exports = {
  client,
  sendFollowUpMessages
};