const twilio = require('twilio');
const sessionStore = require('./sessionStore');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function sendFollowUpMessages(user) {
  if (!user) {
    console.error('❌ sendFollowUpMessages called with invalid or empty user');
    return;
  }

  const session = sessionStore.getOrCreateSession(user);

  if (!session) {
    console.error(`❌ Failed to get or create session for user: ${user}`);
    return;
  }

  if (session.followupsSent) {
    console.log(`ℹ️ Follow-up messages already marked as sent for user: ${user}`);
    return;
  }

  console.log(`🔄 Updating session for user: ${user} to mark followupsSent = true`);
  sessionStore.update(user, { followupsSent: true });

  const from = 'whatsapp:+14155238886';

  try {
    console.log(`📤 Sending follow-up messages to ${user}...`);

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

    console.log(`✅ Successfully sent follow-up messages to ${user}`);
  } catch (error) {
    console.error(`❌ Error sending follow-up messages to ${user}:`, {
      message: error.message,
      code: error.code,
      moreInfo: error.moreInfo || 'No additional info',
      stack: error.stack
    });
  }
}

module.exports = {
  client,
  sendFollowUpMessages
};