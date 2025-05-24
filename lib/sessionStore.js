// lib/sessionStore.js

const sessions = {};

function getOrCreate(user) {
  if (!sessions[user]) {
    sessions[user] = {
      stage: 'intro',
      followupsSent: false,
      allowHatChange: false,
      selectedHat: null
    };
  }
  return sessions[user];
}

function update(user, updates) {
  const session = getOrCreate(user);
  Object.assign(session, updates);
}

function reset(user) {
  sessions[user] = {
    stage: 'intro',
    followupsSent: false,
    allowHatChange: false,
    selectedHat: null
  };
}

function clear(user) {
  delete sessions[user];
}

function get(user) {
  return sessions[user] || null;
}

module.exports = {
  getOrCreate,
  update,
  reset,
  clear,
  get
};