const express = require('express');
const router = express.Router();
const { getNearbyRisk, getRiskGeoJSON, importHistorical, getHistorical, getSafeRouteForLocation } = require('../controllers/riskController');
const { protect, requireRole } = require('../middleware/auth');

router.get('/nearby', getNearbyRisk);
router.get('/geojson', getRiskGeoJSON);
router.get('/historical', getHistorical);
router.get('/safe-route', getSafeRouteForLocation);
router.post('/import-historical', protect, requireRole('admin', 'field_officer'), importHistorical);

module.exports = router;
