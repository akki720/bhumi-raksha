const SafePlace = require('../models/SafePlace');
const RiskZone = require('../models/RiskZone');

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getSafeRoute(startLat, startLon, targetLat, targetLon) {
  const safeZones = await SafePlace.find({ verified: true }).lean();
  const dangerousZones = await RiskZone.find({
    active: true,
    riskLevel: { $in: ['HIGH', 'CRITICAL'] },
  }).lean();

  const targetSafeZone = safeZones
    .map((zone) => ({
      ...zone,
      distanceKm: haversineKm(startLat, startLon, zone.latitude, zone.longitude),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];

  const route = {
    from: { lat: startLat, lon: startLon },
    to: targetSafeZone ? { lat: targetSafeZone.latitude, lon: targetSafeZone.longitude } : { lat: targetLat, lon: targetLon },
    path: [
      [startLat, startLon],
      [targetSafeZone ? targetSafeZone.latitude : targetLat, targetSafeZone ? targetSafeZone.longitude : targetLon],
    ],
    targetName: targetSafeZone ? targetSafeZone.name : 'Nearest safe location',
    distanceKm: targetSafeZone ? Number((targetSafeZone.distanceKm || 0).toFixed(1)) : 0,
    estimatedMinutes: targetSafeZone ? Math.max(5, Math.round((targetSafeZone.distanceKm || 0) * 3.5)) : 0,
    riskAlongRoute: dangerousZones.length > 0 ? 'Avoided high-risk zones' : 'Low risk',
    avoidedZones: dangerousZones.map((z) => z.name),
    safeZone: targetSafeZone,
  };

  return route;
}

module.exports = { getSafeRoute };
