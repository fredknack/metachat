// routes/qrcode.js
const express = require('express');
const QRCode = require('qrcode');
const router = express.Router();

router.get('/', async (req, res) => {
  const businessNumber = '15034214678'; // Your WhatsApp number (no + or formatting)
  const defaultMessage = "Let's Connect!";
  const waLink = `https://wa.me/${businessNumber}?text=${encodeURIComponent(defaultMessage)}`;

  try {
    // Meta blue: #0064e0
    const svgOptions = {
      type: 'svg',
      color: {
        dark: '#0064e0',
        light: '#ffffff'
      },
      width: 600
    };

    const svg = await QRCode.toString(waLink, svgOptions);

    const htmlPage = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>WhatsApp QR Code</title>
          <style>
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background-color: #f5f5f5;
            }
            .qrcode-container {
              box-shadow: 0 4px 12px rgba(0,0,0,0.2);
              padding: 20px;
              background: #ffffff;
              border-radius: 12px;
            }
          </style>
        </head>
        <body>
          <div class="qrcode-container">
            ${svg}
          </div>
        </body>
      </html>
    `;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlPage);
    console.log(`✅ Centered SVG QR code page generated for: ${waLink}`);
  } catch (err) {
    console.error('❌ Failed to generate QR code page:', err);
    res.status(500).send('Error generating QR code page.');
  }
});

module.exports = router;


