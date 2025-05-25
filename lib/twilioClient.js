// twilioClient.js

const twilio = require('twilio');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function sendFollowUpMessages(user) {
  const session = sessionStore.getOrCreateSession(user);

  if (session.followupsSent) {
    console.log(`ℹ️ Follow-up messages already scheduled for ${user}`);
    return;
  }

  try {
    const from = 'whatsapp:+15034214678'; // Ensure this matches your Twilio sender
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
  } catch (error) {
    console.error('Error sending follow-up messages:', error);
    throw error;
  }
}

module.exports = {
  client,
  sendFollowUpMessages
};
