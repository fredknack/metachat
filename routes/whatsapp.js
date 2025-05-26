// routes/whatsapp.js
const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  console.log('🔥 [TEST] Twilio POST received at /whatsapp');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);

  // Always respond with 200 OK so Twilio stops reporting 11200 errors
  res.status(200).send('✅ Twilio POST acknowledged');
});

module.exports = router;