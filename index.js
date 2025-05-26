// index.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Log every request
app.use((req, res, next) => {
  console.log(`🌐 Incoming request: ${req.method} ${req.originalUrl}`);
  console.log('Headers:', req.headers);
  next();
});

// Test POST route for Twilio webhook
app.use('/whatsapp', require('./routes/whatsapp'));

// Root route
app.get('/', (req, res) => {
  res.send('✅ Server is up. POST to /whatsapp for Twilio test.');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});