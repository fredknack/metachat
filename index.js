require('dotenv').config();
require('./lib/followupWorker');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const admin = require('firebase-admin');

const app = express();

// ✅ Initialize Firebase Admin SDK using environment variables
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  })
});

// Attach Firestore to app locals for easy access in routes
app.locals.firestore = admin.firestore();

// Parse both urlencoded (form) and JSON payloads
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Global request logger
app.use((req, res, next) => {
  console.log(`🌐 Incoming request: ${req.method} ${req.originalUrl}`);
  console.log(`Headers:`, req.headers);
  next();
});

// Minimal Twilio test POST endpoint
app.post('/twilio-test', (req, res) => {
  console.log('🔥 [TWILIO TEST] Incoming POST at /twilio-test');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  res.status(200).send('✅ Received by /twilio-test');
});

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'public')));

// Firebase test route
app.use('/firebase-test', require('./routes/firebaseTest'));

// Main app routes
app.use('/', require('./routes/root'));
app.use('/qrcode', require('./routes/qrcode'));
app.use('/whatsapp', require('./routes/whatsapp'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});