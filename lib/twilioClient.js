const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

if (!accountSid || !authToken || !fromNumber) {
  console.error('❌ Missing Twilio configuration. Check your environment variables.');
}

const client = twilio(accountSid, authToken);

async function sendFollowUpMessages(user) {
  if (!user) {
    console.warn(`⚠️ sendFollowUpMessages called with invalid user: ${user}`);
    return;
  }

  console.log(`📨 Sending follow-up message to ${user}`);

  try {
    await client.messages.create({
      from: `whatsapp:${fromNumber}`,
      to: user,
      body: `✨ Reminder: Don’t forget to pick up your swag at Booth #12! We’re excited to meet you.`
    });
    console.log(`✅ Follow-up message sent to ${user}`);
  } catch (err) {
    console.error(`❌ Error sending follow-up message to ${user}:`, err);
  }
}

module.exports = {
  client,
  sendFollowUpMessages
};