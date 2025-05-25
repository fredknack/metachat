const twilio = require('twilio');
const sessionStore = require('./sessionStore');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFromNumber = 'whatsapp:+14155238886';

if (!accountSid || !authToken) {
  throw new Error('Missing Twilio credentials in .env');
}

const client = twilio(accountSid, authToken);
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
  if (to === twilioFromNumber) {
    console.warn(`⚠️ Skipping sendImage: 'to' and 'from' are identical (${to})`);
    return;
  }

  const url = `https://bot.jumpwire.xyz/hats/${hat.toLowerCase().replace(' ', '')}.jpg`;
  try {
    await client.messages.create({
      from: twilioFromNumber,
      to,
      mediaUrl: [url],
      body: `Here’s the ${hat.replace(/([A-Z])/g, ' $1').trim()}!`
    });
    console.log(`✅ Sent image of ${hat} to ${to}`);
  } catch (err) {
    console.error(`❌ Error sending image to ${to}:`, err);
  }
}

function sendFollowUpMessages(user) {
  const session = sessionStore.getOrCreate(user);

  if (!session) {
    console.error(`❌ No session found for user ${user}; skipping follow-ups.`);
    return;
  }

  if (session.followupsSent) {
    console.log(`ℹ️ Follow-up messages already scheduled for ${user}`);
    return;
  }

  sessionStore.update(user, { followupsSent: true });
  clearFollowUpTimers(user);

  console.log(`⏳ Scheduling follow-up messages for ${user}`);

  followUpTimers[user] = {
    fiveMin: setTimeout(async () => {
      try {
        if (user === twilioFromNumber) {
          console.warn(`⚠️ Skipping 5-min follow-up: 'to' and 'from' are identical (${user})`);
        } else {
          await client.messages.create({
            from: twilioFromNumber,
            to: user,
            body: 'Thanks for picking up your SWAG! 🎉 Want to learn more about using WhatsApp for business?\n1. Yes\n2. No'
          });
          console.log(`✅ Sent 5-min follow-up to ${user}`);
        }
      } catch (err) {
        console.error('❌ Error sending 5-minute follow-up:', err);
      }
    }, 5 * 60 * 1000),

    sevenMin: setTimeout(async () => {
      try {
        sessionStore.update(user, { allowHatChange: true });
        if (user === twilioFromNumber) {
          console.warn(`⚠️ Skipping 7-min follow-up: 'to' and 'from' are identical (${user})`);
        } else {
          await client.messages.create({
            from: twilioFromNumber,
            to: user,
            body: 'Are you happy with your choice? Would you like to pick different SWAG?\n1. Yes\n2. No'
          });
          console.log(`✅ Sent 7-min follow-up to ${user}`);
        }
        clearFollowUpTimers(user);
      } catch (err) {
        console.error('❌ Error sending 7-minute follow-up:', err);
      }
    }, 7 * 60 * 1000)
  };
}

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