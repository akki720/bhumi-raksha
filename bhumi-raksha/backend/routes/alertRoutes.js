const express = require('express');
const router = express.Router();
const { getAlerts, getNearbyAlerts, acknowledgeAlert, resolveAlert } = require('../controllers/alertsController');
const { protect, requireRole } = require('../middleware/auth');

router.get('/', protect, requireRole('user', 'authority', 'admin'), getAlerts);
router.get('/nearby', protect, requireRole('user', 'authority', 'admin'), getNearbyAlerts);
router.patch('/:id/acknowledge', protect, requireRole('user', 'authority', 'admin'), acknowledgeAlert);
router.patch('/:id/resolve', protect, requireRole('authority', 'admin'), resolveAlert);

module.exports = router;
