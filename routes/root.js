const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>WhatsApp Bot</title>
        <style>
          body { font-family: Arial; max-width: 800px; margin: auto; padding: 20px; text-align: center; }
          .container { background: #f5f5f5; border-radius: 10px; padding: 20px; margin-top: 20px; }
          h1 { color: #25D366; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>WhatsApp Bot is Running! 🚀</h1>
          <p>Send a POST request to /whatsapp to interact with the bot.</p>
          <p>Or visit <a href="/qrcode">/qrcode</a> to get started with WhatsApp.</p>
        </div>
      </body>
    </html>
  `);
});

module.exports = router;
