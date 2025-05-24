// lib/twilioClient.js

const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  throw new Error('Missing Twilio credentials in .env');
}

const client = twilio(accountSid, authToken);

/**
 * Sends a single swag image with label.
 */
async function sendImage(to, hat) {
  const url = `https://bot.jumpwire.xyz/hats/${hat.toLowerCase().replace(' ', '')}.jpg`;

  return client.messages.create({
    from: 'whatsapp:+14155238886',
    to,
    mediaUrl: [url],
    body: `Here’s the ${hat.replace(/([A-Z])/g, ' $1').trim()}!`
  });
}

/**
 * Schedules follow-up messages after swag selection.
 */
function sendFollowUpMessages(user, sessions) {
  if (sessions[user]?.followupsSent) return;
  sessions[user].followupsSent = true;

  console.log(`⏳ Scheduling follow-up messages for ${user}`);

  // After 5 minutes
  setTimeout(() => {
    client.messages.create({
      from: 'whatsapp:+14155238886',
      to: user,
      body: 'Thanks for picking up your SWAG! 🎉 Want to learn more about using WhatsApp for business?\n1. Yes\n2. No'
    }).catch(err => console.error('Error sending 5-minute follow-up:', err));
  }, 5 * 60 * 1000);

  // After 7 minutes
  setTimeout(() => {
    client.messages.create({
      from: 'whatsapp:+14155238886',
      to: user,
      body: 'Are you happy with your choice? Would you like to pick different SWAG?\n1. Yes\n2. No'
    }).catch(err => console.error('Error sending 7-minute follow-up:', err));

    if (sessions[user]) {
      sessions[user].allowHatChange = true;
    }
  }, 7 * 60 * 1000);
}

module.exports = {
  client,
  sendImage,
  sendFollowUpMessages
};
