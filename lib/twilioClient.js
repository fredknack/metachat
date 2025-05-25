// lib/twilioClient.js
const twilio = require('twilio');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Explicit FROM number
const fromNumber = 'whatsapp:+15034214678';

// Example follow-up function (make sure you actually have this)
async function sendFollowUpMessages(user, sessionStore) {
  const session = sessionStore.getOrCreate(user);
  if (!session) {
    console.error(`❌ Cannot send follow-ups — no session for user: ${user}`);
    return;
  }

  try {
    await client.messages.create({
      from: fromNumber,
      to: user,
      body: `Hey again! Just a reminder — you can still pick your swag! 🎁 Reply 1 for Wallet, 2 for Sunglasses, 3 for Water Bottle.`
    });

    sessionStore.update(user, { followupsSent: true });
    console.log(`✅ Follow-up message sent to ${user}`);
  } catch (error) {
    console.error(`❌ Error sending follow-up to ${user}:`, error);
  }
}

module.exports = {
  client,
  sendFollowUpMessages,
  fromNumber // Export if needed elsewhere
};