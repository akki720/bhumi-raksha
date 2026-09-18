const express = require('express');
const router = express.Router();
const { queueOfflineReport } = require('../controllers/offlineController');

router.post('/queue-report', queueOfflineReport);

module.exports = router;
