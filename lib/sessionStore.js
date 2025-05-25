// sessionStore.js

const sessions = {};

function getOrCreateSession(userId) {
  if (!userId) {
    console.error('❌ getOrCreateSession called with invalid userId:', userId);
    return null;
  }

  if (!sessions[userId]) {
    console.log(`🆕 Creating new session for user: ${userId}`);
    sessions[userId] = {
      followupsSent: false,
      selectedHat: null,
      stage: 'start'
    };
  } else {
    // Defensive: make sure all expected fields exist
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

function update(userId, updates) {
  if (!userId) {
    console.error('❌ update called with invalid userId:', userId);
    return null;
  }

  if (!sessions[userId]) {
    console.warn(`⚠️ No existing session found for ${userId}, creating new one.`);
    sessions[userId] = {
      followupsSent: false,
      selectedHat: null,
      stage: 'start'
    };
  }

  sessions[userId] = { ...sessions[userId], ...updates };
  console.log(`🔄 Updated session for ${userId}:`, sessions[userId]);

  return sessions[userId];
}

function resetSession(userId) {
  if (!userId) {
    console.error('❌ resetSession called with invalid userId:', userId);
    return;
  }

  sessions[userId] = {
    followupsSent: false,
    selectedHat: null,
    stage: 'start'
  };
  console.log(`🔄 Session reset for ${userId}`);
}

function getAllSessions() {
  return sessions;
}

module.exports = {
  getOrCreateSession,
  update,
  resetSession,
  getAllSessions
};