// twilioClient.js

const twilio = require('twilio');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function sendFollowUpMessages(to) {
  try {
    const from = 'whatsapp:+15034214678'; // Ensure this matches your Twilio sender
    await Promise.all([
      client.messages.create({
        from,
        to,
        body: 'Thank you for your swag selection! 🎁'
      }),
      client.messages.create({
        from,
        to,
        body: 'We will notify you when your swag is shipped. 🚚'
      })
    ]);
  } catch (error) {
    console.error('Error sending follow-up messages:', error);
    throw error;
  }
}

module.exports = {
  client,
  sendFollowUpMessages
};
