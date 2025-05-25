// lib/twilioClient.js

const twilio = require('twilio');
const sessionStore = require('./sessionStore');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';  // fallback to sandbox

if (!accountSid || !authToken) {
  throw new Error('Missing Twilio credentials in .env');
}

const client = twilio(accountSid, authToken);

// Track active follow-up timers per user
const followUpTimers = {};

/**
 * Clears any existing follow-up timers for the user.
 */
function clearFollowUpTimers(user) {
  if (followUpTimers[user]) {
    clearTimeout(followUpTimers[user].fiveMin);
    clearTimeout(followUpTimers[user].sevenMin);
    delete followUpTimers[user];
    console.log(`🧹 Cleared follow-up timers for ${user}`);
  }
}

/**
 * Sends a single swag image with label.
 */
async function sendImage(to, hat) {
  const url = `https://bot.jumpwire.xyz/hats/${hat.toLowerCase().replace(' ', '')}.jpg`;

  console.log(`📤 Sending swag image FROM ${twilioWhatsAppNumber} TO ${to} | Item: ${hat}`);

  return client.messages.create({
    from: twilioWhatsAppNumber,
    to,
    mediaUrl: [url],
    body: `Here’s the ${hat.replace(/([A-Z])/g, ' $1').trim()}!`
  }).catch(err => {
    console.error(`❌ Error sending swag image (${hat}) to ${to}:`, err);
  });
}

/**
 * Schedules follow-up messages after swag selection, ensuring only one active chain.
 */
function sendFollowUpMessages(to) {
  const session = sessionStore.getOrCreate(to);

  if (!session) {
    console.error(`❌ No session found for user ${to}, cannot schedule follow-ups`);
    return;
  }

  if (session.followupsSent) {
    console.log(`ℹ️ Follow-up messages already scheduled for ${to}`);
    return;
  }

  sessionStore.update(to, { followupsSent: true });

  // Clear any existing timers before setting new ones
  clearFollowUpTimers(to);

  console.log(`⏳ Scheduling follow-up messages for ${to}`);

  // Schedule 5-minute message
  const fiveMinTimer = setTimeout(() => {
    console.log(`📤 Sending 5-min follow-up FROM ${twilioWhatsAppNumber} TO ${to}`);
    client.messages.create({
      from: twilioWhatsAppNumber,
      to,
      body: 'Thanks for picking up your SWAG! 🎉 Want to learn more about using WhatsApp for business?\n1. Yes\n2. No'
    }).catch(err => console.error('❌ Error sending 5-minute follow-up:', err));
  }, 5 * 60 * 1000);

  // Schedule 7-minute message
  const sevenMinTimer = setTimeout(() => {
    sessionStore.update(to, { allowHatChange: true });

    console.log(`📤 Sending 7-min follow-up FROM ${twilioWhatsAppNumber} TO ${to}`);
    client.messages.create({
      from: twilioWhatsAppNumber,
      to,
      body: 'Are you happy with your choice? Would you like to pick different SWAG?\n1. Yes\n2. No'
    }).catch(err => console.error('❌ Error sending 7-minute follow-up:', err));

    clearFollowUpTimers(to);
  }, 7 * 60 * 1000);

  // Store active timers
  followUpTimers[to] = {
    fiveMin: fiveMinTimer,
    sevenMin: sevenMinTimer
  };
}

/**
 * Expose a manual cancel function if needed.
 */
function cancelFollowUps(user) {
  clearFollowUpTimers(user);
  sessionStore.update(user, { followupsSent: false, allowHatChange: false });
  console.log(`🛑 Follow-up chain canceled for ${user}`);
}

module.exports = {
  client,
  sendImage,
  sendFollowUpMessages,
  cancelFollowUps
};