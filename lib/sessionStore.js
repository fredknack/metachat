// sessionStore.js

const sessions = {}; // In-memory session store (can replace with Redis or DB if scaling)

function getOrCreate(user) {
  if (!sessions[user]) {
    sessions[user] = {
      stage: 'intro',
      selectedHat: null,
      followupsSent: false,
      allowHatChange: true,
    };
    console.log(`✅ Created new session for user: ${user}`);
  }
  return sessions[user];
}

function update(user, updates) {
  if (!sessions[user]) {
    getOrCreate(user);
  }
  sessions[user] = {
    ...sessions[user],
    ...updates,
  };
  console.log(`🔄 Updated session for ${user}:`, sessions[user]);
}

function reset(user) {
  sessions[user] = {
    stage: 'intro',
    selectedHat: null,
    followupsSent: false,
    allowHatChange: true,
  };
  console.log(`♻️ Reset session for ${user}`);
}

function clear(user) {
  delete sessions[user];
  console.log(`❌ Cleared session for ${user}`);
}

module.exports = {
  getOrCreate,
  update,
  reset,
  clear,
};