const twilio = require('twilio');
const sessionStore = require('./sessionStore');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const FROM_NUMBER = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+15034214678';

const client = twilio(accountSid, authToken);

async function sendFollowUpMessages(user) {
  if (!user) {
    console.error('❌ sendFollowUpMessages called with invalid user');
    return;
  }

  const session = sessionStore.getOrCreateSession(user);
  if (!session) {
    console.error(`❌ Could not get or create session for user: ${user}`);
    return;
  }

  if (session.followupsSent) {
    console.log(`ℹ️ Follow-up messages already scheduled for ${user}`);
    return;
  }

  try {
    sessionStore.update(user, { followupsSent: true });
  } catch (err) {
    console.error(`❌ Failed to update session for ${user}:`, err);
    return; // stop here to avoid double-sending
  }

  try {
    await Promise.all([
      client.messages.create({
        from: FROM_NUMBER,
        to: user,
        body: 'Thank you for your swag selection! 🎁'
      }),
      client.messages.create({
        from: FROM_NUMBER,
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