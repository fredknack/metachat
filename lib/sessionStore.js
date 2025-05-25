// sessionStore.js

const sessions = {};

// Always returns a new safe session object
function createDefaultSession() {
  return {
    followupsSent: false,
    selectedHat: null,
    stage: 'start'
  };
}

function getOrCreateSession(userId) {
  if (!userId) {
    console.error('❌ getOrCreateSession called with invalid userId:', userId);
    return createDefaultSession();
  }

  if (!sessions[userId]) {
    console.log(`🆕 Creating new session for user: ${userId}`);
    sessions[userId] = createDefaultSession();
  }

  return sessions[userId];
}

function update(userId, updates) {
  if (!userId) {
    console.error('❌ update called with invalid userId:', userId);
    return;
  }

  // 🔒 FORCE ENSURE SESSION EXISTS
  if (!sessions[userId]) {
    console.warn(`⚠️ No existing session found for ${userId} during update — creating one.`);
    sessions[userId] = createDefaultSession();
  }

  sessions[userId] = { ...sessions[userId], ...updates };
  console.log(`🔄 Session updated for ${userId}:`, sessions[userId]);
}

function resetSession(userId) {
  if (!userId) {
    console.error('❌ resetSession called with invalid userId:', userId);
    return;
  }

  sessions[userId] = createDefaultSession();
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