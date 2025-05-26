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

  const from = FROM_NUMBER;

  // Immediate confirmation
  await client.messages.create({
    from,
    to: user,
    body: '✅ Thank you for your swag selection! 🎁'
  });

  // 5-minute delayed message
  setTimeout(() => {
    client.messages.create({
      from,
      to: user,
      body: 'Are you happy with your swag selection? Enter 1 for yes, enter 2 if you would like to exchange it.'
    }).then(() => console.log(`✅ 5-min follow-up sent to ${user}`))
      .catch(err => console.error(`❌ Error sending 5-min follow-up to ${user}:`, err));
  }, 5 * 60 * 1000);

  // 7-minute delayed message
  setTimeout(() => {
    client.messages.create({
      from,
      to: user,
      body: '🌟 Learn more about Salesforce Marketing Cloud! Visit: https://invite.salesforce.com/salesforceconnectionsmetaprese'
    }).then(() => console.log(`✅ 7-min follow-up sent to ${user}`))
      .catch(err => console.error(`❌ Error sending 7-min follow-up to ${user}:`, err));
  }, 7 * 60 * 1000);
}

module.exports = {
  client,
  sendFollowUpMessages
};