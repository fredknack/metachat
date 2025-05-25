const twilio = require('twilio');
const sessionStore = require('./sessionStore');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  throw new Error('Missing Twilio credentials in .env');
}

const client = twilio(accountSid, authToken);
const fromNumber = 'whatsapp:+14155238886';

// Track active follow-up timers per user
const followUpTimers = {};

function clearFollowUpTimers(user) {
  if (followUpTimers[user]) {
    clearTimeout(followUpTimers[user].fiveMin);
    clearTimeout(followUpTimers[user].sevenMin);
    delete followUpTimers[user];
    console.log(`🧹 Cleared follow-up timers for ${user}`);
  }
}

async function sendImage(to, hat) {
  if (to === fromNumber) {
    console.warn(`⚠️ Skipping sendImage: cannot send to same number as 'from' (${to})`);
    return;
  }

  const url = `https://bot.jumpwire.xyz/hats/${hat.toLowerCase().replace(' ', '')}.jpg`;

  return client.messages.create({
    from: fromNumber,
    to,
    mediaUrl: [url],
    body: `Here’s the ${hat.replace(/([A-Z])/g, ' $1').trim()}!`
  });
}

function sendFollowUpMessages(user) {
  if (!user) {
    console.error(`❌ sendFollowUpMessages called with invalid user:`, user);
    return;
  }

  if (user === fromNumber) {
    console.warn(`⚠️ Skipping follow-ups: cannot send to same number as 'from' (${user})`);
    return;
  }

  const session = sessionStore.getOrCreate(user);
  if (!session) {
    console.error(`❌ No valid session returned for user: ${user} — skipping follow-ups.`);
    return;
  }

  if (session.followupsSent) {
    console.log(`ℹ️ Follow-up messages already scheduled for ${user}`);
    return;
  }

  sessionStore.update(user, { followupsSent: true });
  clearFollowUpTimers(user);

  console.log(`⏳ Scheduling follow-up messages for ${user}`);

  const fiveMinTimer = setTimeout(() => {
    client.messages.create({
      from: fromNumber,
      to: user,
      body: 'Thanks for picking up your SWAG! 🎉 Want to learn more about using WhatsApp for business?\n1. Yes\n2. No'
    }).catch(err => console.error('❌ Error sending 5-minute follow-up:', err));
  }, 5 * 60 * 1000);

  const sevenMinTimer = setTimeout(() => {
    sessionStore.update(user, { allowHatChange: true });

    client.messages.create({
      from: fromNumber,
      to: user,
      body: 'Are you happy with your choice? Would you like to pick different SWAG?\n1. Yes\n2. No'
    }).catch(err => console.error('❌ Error sending 7-minute follow-up:', err));

    clearFollowUpTimers(user);
  }, 7 * 60 * 1000);

  followUpTimers[user] = {
    fiveMin: fiveMinTimer,
    sevenMin: sevenMinTimer
  };
}

function cancelFollowUps(user) {
  clearFollowUpTimers(user);

  const session = sessionStore.getOrCreate(user);
  if (!session) {
    console.error(`❌ No valid session found when canceling follow-ups for ${user}`);
    return;
  }

  sessionStore.update(user, { followupsSent: false, allowHatChange: false });
  console.log(`🛑 Follow-up chain canceled for ${user}`);
}

module.exports = {
  client,
  sendImage,
  sendFollowUpMessages,
  cancelFollowUps
};