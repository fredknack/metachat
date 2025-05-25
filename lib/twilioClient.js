// twilioClient.js

const twilio = require('twilio');
const sessions = require('./sessionStore');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function sendFollowUpMessages(user) {
  try {
    // Ensure the session exists
    if (!sessions[user]) {
      console.warn(`⚠️ No session found for ${user}, creating new session.`);
      sessions[user] = { stage: 'intro', followupsSent: false };
    }

    // Check if follow-ups already sent
    if (sessions[user].followupsSent) {
      console.log(`ℹ️ Follow-up messages already scheduled for ${user}`);
      return;
    }

    console.log('SESSION KEYS:', Object.keys(sessions));
    console.log('SESSION OBJECT:', sessions[user]);

    // Mark follow-ups as sent
    sessions[user].followupsSent = true;

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