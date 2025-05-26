const express = require('express');
const QRCode = require('qrcode');
const router = express.Router();

router.get('/', async (req, res) => {
  const businessNumber = '15034214678'; // Your WhatsApp number (no + or formatting)
  const defaultMessage = 'start';
  const waLink = `https://wa.me/${businessNumber}?text=${encodeURIComponent(defaultMessage)}`;

  try {
    // Meta blue: #0064e0
    const svgOptions = {
      type: 'svg',
      color: {
        dark: '#0064e0', // Meta brand blue
        light: '#ffffff'
      },
      width: 600 // increase size for printing
    };

    const svg = await QRCode.toString(waLink, svgOptions);

    res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
    res.end(svg);
    console.log(`✅ SVG QR code (Meta blue, large) generated for: ${waLink}`);
  } catch (err) {
    console.error('❌ Failed to generate QR code:', err);
    res.status(500).send('Error generating QR code.');
  }
});

module.exports = router;
