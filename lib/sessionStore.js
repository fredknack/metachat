// sessionStore.js

const sessions = {};

// Default structure for new sessions
function createDefaultSession() {
  return {
    followupsSent: false,
    selectedHat: null,
    stage: 'start'
  };
}

// Always return a valid session object
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

// Update session safely
function update(userId, updates) {
  if (!userId) {
    console.error('❌ update called with invalid userId:', userId);
    return;
  }

  const session = getOrCreateSession(userId);
  Object.assign(session, updates);
  console.log(`🔄 Session updated for ${userId}:`, session);
}

// Reset session to default
function resetSession(userId) {
  if (!userId) {
    console.error('❌ resetSession called with invalid userId:', userId);
    return;
  }

  sessions[userId] = createDefaultSession();
  console.log(`🔄 Session reset for ${userId}`);
}

// Expose all sessions (for debugging or admin routes)
function getAllSessions() {
  return sessions;
}

module.exports = {
  getOrCreateSession,
  update,
  resetSession,
  getAllSessions
};