require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));

// Log every incoming request (global middleware)
app.use((req, res, next) => {
  console.log(`[DEBUG] Incoming request: ${req.method} ${req.originalUrl}`);
  console.log(`[DEBUG] Headers: ${JSON.stringify(req.headers)}`);
  next();
});

// Serve static files
app.use('/hats', express.static(path.join(__dirname, 'hats')));

// Routes
app.use('/', require('./routes/root'));
app.use('/qrcode', require('./routes/qrcode'));
app.use('/whatsapp', require('./routes/whatsapp'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});