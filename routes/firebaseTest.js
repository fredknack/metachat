const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

router.get('/firebase-test', async (req, res) => {
  try {
    const testRef = admin.firestore().collection('test');
    await testRef.add({
      timestamp: new Date(),
      message: 'Firebase test successful!'
    });

    res.send('✅ Firebase test document written!');
  } catch (err) {
    console.error('❌ Firebase test failed:', err);
    res.status(500).send('❌ Firebase test failed.');
  }
});

module.exports = router;