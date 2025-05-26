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
  if (session.followupsSent) {
    console.log(`ℹ️ Follow-ups already sent or scheduled for ${user}`);
    return;
  }

  sessionStore.update(user, { followupsSent: true });

  const from = FROM_NUMBER;

  // Immediate confirmation
  await client.messages.create({
    from,
    to: user,
    body: '✅ Thank you for your swag selection! 🎁'
  });

  console.log(`⏰ Scheduling 5-min follow-up for ${user}`);
  setTimeout(() => {
    client.messages.create({
      from,
      to: user,
      body: '⏰ Reminder: Don’t forget to pick up your swag at Booth #12!'
    }).then(() => console.log(`✅ 5-min follow-up sent to ${user}`))
      .catch(err => console.error(`❌ Error sending 5-min follow-up to ${user}:`, err));
  }, 5 * 60 * 1000);

  console.log(`⏰ Scheduling 7-min follow-up for ${user}`);
  setTimeout(() => {
    client.messages.create({
      from,
      to: user,
      body: '🌟 Check out our Salesforce demo happening now on the main screen!'
    }).then(() => console.log(`✅ 7-min follow-up sent to ${user}`))
      .catch(err => console.error(`❌ Error sending 7-min follow-up to ${user}:`, err));
  }, 7 * 60 * 1000);
}

module.exports = {
  client,
  sendFollowUpMessages
};