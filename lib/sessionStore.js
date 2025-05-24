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

module.exports = {
  getOrCreate,
  reset,
  clear
};
