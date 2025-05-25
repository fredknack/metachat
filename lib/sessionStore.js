const sessions = {};

function getOrCreate(user) {
  if (typeof user !== 'string' || user.trim() === '') {
    console.warn('⚠️ Warning: getOrCreate called with invalid user key:', user);
    return null;
  }

  if (!sessions[user]) {
    console.log(`🆕 Creating new session for user: ${user}`);
    sessions[user] = {
      stage: 'intro',
      followupsSent: false,
      allowHatChange: false,
      selectedHat: null,
      lastUpdated: Date.now()
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

  Object.assign(session, updates, { lastUpdated: Date.now() });
  console.log(`✅ Session updated for ${user}:`, { ...updates });
}

function reset(user) {
  if (typeof user !== 'string' || user.trim() === '') {
    console.warn('⚠️ Warning: reset called with invalid user key:', user);
    return;
  }

  sessions[user] = {
    stage: 'intro',
    followupsSent: false,
    allowHatChange: false,
    selectedHat: null,
    lastUpdated: Date.now()
  };
  console.log(`🔄 Session reset for user: ${user}`);
}

function clear(user) {
  if (typeof user !== 'string' || user.trim() === '') {
    console.warn('⚠️ Warning: clear called with invalid user key:', user);
    return;
  }
  delete sessions[user];
  console.log(`🗑️ Session cleared for user: ${user}`);
}

function getAll() {
  return { ...sessions };
}

module.exports = {
  getOrCreate,
  update,
  reset,
  clear,
  getAll
};