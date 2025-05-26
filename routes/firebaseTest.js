const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

router.get('/firebase-test', async (req, res) => {
  try {
    const testRef = admin.firestore().collection('test');
    await testRef.add({
      timestamp: new Date(),
      method: 'GET',
      message: 'Firebase test GET successful!'
    });

    res.send('✅ Firebase test GET document written!');
  } catch (err) {
    console.error('❌ Firebase test GET failed:', err);
    res.status(500).send('❌ Firebase test GET failed.');
  }
});

router.post('/firebase-test', async (req, res) => {
  try {
    const testRef = admin.firestore().collection('test');
    await testRef.add({
      timestamp: new Date(),
      method: 'POST',
      message: 'Firebase test POST successful!',
      bodyReceived: req.body
    });

    res.send('✅ Firebase test POST document written!');
  } catch (err) {
    console.error('❌ Firebase test POST failed:', err);
    res.status(500).send('❌ Firebase test POST failed.');
  }
});

module.exports = router;