const express = require('express');
const QRCode = require('qrcode');
const router = express.Router();

router.get('/', async (req, res) => {
  const businessNumber = '15034214678'; // Replace with your real number
  const defaultMessage = 'start';
  const waLink = `https://wa.me/${businessNumber}?text=${encodeURIComponent(defaultMessage)}`;

  try {
    const qrBuffer = await QRCode.toBuffer(waLink);
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(qrBuffer);
    console.log('✅ QR code generated for:', waLink);
  } catch (err) {
    console.error('❌ QR code generation failed:', err);
    res.status(500).send('Error generating QR code.');
  }
});

module.exports = router;
