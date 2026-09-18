const express = require('express');
const router = express.Router();
const { getNearbySafePlaces, getAllSafePlaces, createSafePlace } = require('../controllers/safePlacesController');
const { protect, requireRole } = require('../middleware/auth');

router.get('/nearby', getNearbySafePlaces);
router.get('/', getAllSafePlaces);
router.post('/', protect, requireRole('admin'), createSafePlace);

module.exports = router;
