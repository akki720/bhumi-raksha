const express = require('express');
const router = express.Router();
const { createSOS, getSOS, resolveSOS } = require('../controllers/sosController');
const { protect, requireRole } = require('../middleware/auth');

router.post('/', createSOS);
router.get('/', protect, requireRole('admin', 'field_officer'), getSOS);
router.patch('/:id/resolve', protect, requireRole('admin', 'field_officer'), resolveSOS);

module.exports = router;
