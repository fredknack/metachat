const fs = require('fs');
const path = require('path');

const SESSIONS_FILE = path.join(__dirname, 'sessions.json');

// Load sessions from file at startup
let sessions = {};
if (fs.existsSync(SESSIONS_FILE)) {
  try {
    sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
    console.log('✅ Sessions loaded from file.');
  } catch (err) {
    console.error('❌ Failed to load sessions from file:', err);
  }
}

// Default structure for new sessions
function createDefaultSession() {
  return {
    followupsSent: false,
    selectedHat: null,
    stage: 'start'
  };
}

// Save sessions to disk
function saveSessionsToFile() {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf8');
    console.log('✅ Sessions saved to file.');
  } catch (err) {
    console.error('❌ Failed to save sessions to file:', err);
  }
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
    saveSessionsToFile();
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
  saveSessionsToFile();
}

// Reset session to default
function resetSession(userId) {
  if (!userId) {
    console.error('❌ resetSession called with invalid userId:', userId);
    return;
  }

  sessions[userId] = createDefaultSession();
  console.log(`🔄 Session reset for ${userId}`);
  saveSessionsToFile();
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