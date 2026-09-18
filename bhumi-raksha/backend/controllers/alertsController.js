const asyncHandler = require('express-async-handler');
const Alert = require('../models/Alert');
const { distanceKm } = require('../services/geoUtils');
const socketService = require('../services/socketService');

const RECENT_DUPLICATE_WINDOW_MIN = 30;

/**
 * Internal helper (not an HTTP route) used by riskController when a
 * HIGH/CRITICAL risk is detected. Avoids spamming duplicate alerts for the
 * same spot within a short window.
 */
async function createAlertInternal({ riskLevel, riskScore, lat, lon, riskZoneId, message }) {
  const cutoff = new Date(Date.now() - RECENT_DUPLICATE_WINDOW_MIN * 60 * 1000);
  const existing = await Alert.findOne({
    active: true,
    createdAt: { $gte: cutoff },
    location: {
      $near: { $geometry: { type: 'Point', coordinates: [lon, lat] }, $maxDistance: 500 },
    },
  });
  if (existing) {
    if (existing.riskLevel !== riskLevel || existing.riskScore !== riskScore) {
      existing.riskLevel = riskLevel;
      existing.riskScore = riskScore;
      existing.message = message;
      await existing.save();
      socketService.emitNewAlert(existing);
    }
    return existing;
  }

  const alert = await Alert.create({
    type: 'LANDSLIDE_RISK',
    riskZone: riskZoneId,
    riskLevel,
    riskScore,
    location: { type: 'Point', coordinates: [lon, lat] },
    latitude: lat,
    longitude: lon,
    message,
  });
  socketService.emitNewAlert(alert);
  return alert;
}

// GET /api/alerts
const getAlerts = asyncHandler(async (req, res) => {
  const activeOnly = req.query.active !== 'false';
  const query = activeOnly ? { active: true } : {};

  if (req.user && req.user.role === 'authority') {
    query.riskLevel = { $in: ['HIGH', 'CRITICAL'] };
  }

  const alerts = await Alert.find(query).sort({ createdAt: -1 }).limit(200).lean();
  res.json({ available: true, count: alerts.length, alerts });
});

// GET /api/alerts/nearby?lat=&lon=&radiusKm=
const getNearbyAlerts = asyncHandler(async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  const radiusKm = Number(req.query.radiusKm || 10);
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    res.status(400);
    throw new Error('lat and lon query parameters are required and must be numeric');
  }

  const locationQuery = {
    active: true,
    location: {
      $near: { $geometry: { type: 'Point', coordinates: [lon, lat] }, $maxDistance: radiusKm * 1000 },
    },
  };

  if (req.user && req.user.role === 'authority') {
    locationQuery.riskLevel = { $in: ['HIGH', 'CRITICAL'] };
  }

  const alerts = await Alert.find(locationQuery)
    .limit(50)
    .lean();

  const withDistance = alerts.map((a) => ({
    ...a,
    distanceKm: distanceKm(lat, lon, a.latitude, a.longitude),
  }));

  res.json({ available: true, count: withDistance.length, alerts: withDistance });
});

// PATCH /api/alerts/:id/acknowledge
const acknowledgeAlert = asyncHandler(async (req, res) => {
  const alert = await Alert.findById(req.params.id);
  if (!alert) {
    res.status(404);
    throw new Error('Alert not found');
  }
  alert.acknowledged = true;
  await alert.save();
  res.json({ available: true, alert });
});

// PATCH /api/alerts/:id/resolve
const resolveAlert = asyncHandler(async (req, res) => {
  const alert = await Alert.findById(req.params.id);
  if (!alert) {
    res.status(404);
    throw new Error('Alert not found');
  }
  alert.active = false;
  alert.resolvedAt = new Date();
  await alert.save();
  res.json({ available: true, alert });
});

module.exports = { getAlerts, getNearbyAlerts, acknowledgeAlert, resolveAlert, createAlertInternal };
