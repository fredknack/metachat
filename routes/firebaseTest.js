const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// GET route — just confirms the route is live
router.get('/', (req, res) => {
  res.send('✅ Firebase test route is live! Use POST to write a test document.');
});

// POST route — writes a test document to Firestore
router.post('/', async (req, res) => {
  try {
    const testRef = admin.firestore().collection('test');
    await testRef.add({
      timestamp: new Date(),
      message: 'Firebase test POST successful!'
    });

    console.log('✅ Firebase test document written!');
    res.send('✅ Firebase test document written!');
  } catch (err) {
    console.error('❌ Firebase test failed:', err);
    res.status(500).send('❌ Firebase test failed.');
  }
});

module.exports = router;