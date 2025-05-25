// === lib/twilioClient.js ===
const twilio = require('twilio');
const sessionStore = require('./sessionStore');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

const YOUR_TWILIO_NUMBER = 'whatsapp:+15034214678'; // replace with your Twilio WhatsApp number

async function sendFollowUpMessages(user) {
  const session = sessionStore.getOrCreate(user);
  if (!session) {
    console.warn(`⚠️ No session found for ${user}, cannot send follow-ups.`);
    return;
  }

  session.followupsSent = true;

  try {
    await client.messages.create({
      from: YOUR_TWILIO_NUMBER,
      to: user,
      body: '⏰ Reminder: Don’t forget to pick up your swag at booth #12!'
    });
    console.log(`✅ Follow-up message sent to ${user}`);
  } catch (error) {
    console.error(`❌ Failed to send follow-up message to ${user}:`, error);
  }
}

module.exports = {
  client,
  sendFollowUpMessages,
  YOUR_TWILIO_NUMBER
};