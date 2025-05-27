require('dotenv').config();
require('./lib/followupWorker');
console.log('✅ FIREBASE_PRIVATE_KEY loaded:', !!process.env.FIREBASE_PRIVATE_KEY);

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();

const { firestore } = require('./lib/firebase');

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception thrown:', err);
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use((req, res, next) => {
  console.log(`🌐 Incoming request: ${req.method} ${req.originalUrl}`);
  console.log(`Headers:`, req.headers);
  next();
});

app.post('/twilio-test', (req, res) => {
  console.log('🔥 [TWILIO TEST] Incoming POST at /twilio-test');
  console.log('Body:', req.body);
  res.status(200).send('✅ Received by /twilio-test');
});

app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/firebase-test', require('./routes/firebaseTest'));
app.use('/', require('./routes/root'));
app.use('/qrcode', require('./routes/qrcode'));
app.use('/whatsapp', require('./routes/whatsapp'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});