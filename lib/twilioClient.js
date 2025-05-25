// lib/twilioClient.js
const twilio = require('twilio');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Explicit FROM number
const fromNumber = 'whatsapp:+15034214678';

async function sendFollowUpMessages(user, sessionStore) {
  const to = user;

  if (to === fromNumber) {
    console.warn(`⚠️ Skipping follow-up: to and from are identical (${to})`);
    return;
  }

  const session = sessionStore.getOrCreate(user);
  if (!session) {
    console.warn(`⚠️ No session found for user ${user}, skipping follow-up`);
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
  fromNumber
};