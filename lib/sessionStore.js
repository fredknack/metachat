const sessions = {};

function getOrCreate(user) {
  if (!user) {
    console.warn('⚠️ Warning: getOrCreate called with invalid user key:', user);
    return null;
  }

  if (!sessions[user]) {
    console.log(`🆕 Creating new session for user: ${user}`);
    sessions[user] = {
      stage: 'intro',
      followupsSent: false,
      allowHatChange: false,
      selectedHat: null
    };
  } else {
    console.log(`🔍 Retrieved existing session for user: ${user}`);
  }

  return sessions[user];
}

function update(user, updates) {
  const session = getOrCreate(user);
  if (!session) {
    console.error(`❌ Cannot update session — no valid session found for user: ${user}`);
    return;
  }
  Object.assign(session, updates);
  console.log(`✅ Session updated for ${user}:`, updates);
}

function reset(user) {
  if (!user) {
    console.warn('⚠️ Warning: reset called with invalid user key:', user);
    return;
  }
  sessions[user] = {
    stage: 'intro',
    followupsSent: false,
    allowHatChange: false,
    selectedHat: null
  };
  console.log(`🔄 Session reset for user: ${user}`);
}

function clear(user) {
  if (!user) {
    console.warn('⚠️ Warning: clear called with invalid user key:', user);
    return;
  }
  delete sessions[user];
  console.log(`🗑️ Session cleared for user: ${user}`);
}

module.exports = {
  getOrCreate,
  update,
  reset,
  clear
};