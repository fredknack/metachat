// sessionStore.js

const sessions = {};

function getOrCreateSession(userId) {
  if (!sessions[userId]) {
    sessions[userId] = {
      followupsSent: false,
      selectedHat: null,
      stage: 'start'
    };
  } else {
    // Ensure all expected fields are present even in existing sessions
    if (typeof sessions[userId].followupsSent === 'undefined') {
      sessions[userId].followupsSent = false;
    }
    if (typeof sessions[userId].selectedHat === 'undefined') {
      sessions[userId].selectedHat = null;
    }
    if (typeof sessions[userId].stage === 'undefined') {
      sessions[userId].stage = 'start';
    }
  }
  return sessions[userId];
}

function resetSession(userId) {
  sessions[userId] = {
    followupsSent: false,
    selectedHat: null,
    stage: 'start'
  };
}

module.exports = {
  getOrCreateSession,
  resetSession
};


