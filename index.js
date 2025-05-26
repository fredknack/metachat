require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

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

// Routes
app.use('/', require('./routes/root'));
app.use('/qrcode', require('./routes/qrcode'));
app.use('/whatsapp', require('./routes/whatsapp'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});