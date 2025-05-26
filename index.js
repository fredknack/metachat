// index.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));

// Minimal Twilio test POST endpoint
app.post('/twilio-test', (req, res) => {
  console.log('🔥 [TWILIO TEST] Incoming POST at /twilio-test');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);

  res.status(200).send('✅ Received by /twilio-test');
});

// Serve static files
app.use('/hats', express.static(path.join(__dirname, 'hats')));

// Routes
app.use('/', require('./routes/root'));
app.use('/qrcode', require('./routes/qrcode'));
app.use('/whatsapp', require('./routes/whatsapp'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});