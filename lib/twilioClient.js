// twilioClient.js

const twilio = require('twilio');
const sessionStore = require('./sessionStore');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function sendFollowUpMessages(user) {
  try {
    const session = sessionStore.getOrCreateSession(user);
    if (!session) {
      console.error(`❌ Could not create/retrieve session for user: ${user}`);
      return;
    }

    if (session.followupsSent) {
      console.log(`ℹ️ Follow-up messages already scheduled for ${user}`);
      return;
    }

    console.log('SESSION KEYS:', Object.keys(sessions));
    console.log('SESSION OBJECT:', sessions[user]);
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
