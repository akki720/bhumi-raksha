const cron = require('node-cron');
const RiskZone = require('../models/RiskZone');
const weatherService = require('./weatherService');
const elevationService = require('./elevationService');
const soilService = require('./soilService');
const riskEngine = require('./riskEngine');
const socketService = require('./socketService');
const alertsController = require('../controllers/alertsController');

/**
 * Recomputes risk for every active RiskZone using live data, updates the
 * document, and broadcasts risk:update over Socket.IO so the React map and
 * dashboard refresh without a page reload. Runs on a schedule and can also
 * be triggered manually via refreshAllZones().
 */
async function refreshZone(zone) {
  const [lon, lat] = zone.location.coordinates;
  try {
    const [weather, terrain, soil] = await Promise.all([
      weatherService.getCurrentWeather(lat, lon),
      elevationService.getElevationAndSlope(lat, lon),
      soilService.getSoilMoisture(lat, lon),
    ]);

    const result = await riskEngine.calculateRisk({
      lat,
      lon,
      rainfallMm: weather.available ? weather.rainfallMm : null,
      soilMoisturePct: soil.soilMoistureAvailable ? soil.soilMoisturePct : null,
      slopeDegrees: terrain.slopeAvailable ? terrain.slopeDegrees : null,
      windSpeedKph: weather.available ? weather.windSpeedKph : null,
      humidityPct: weather.available ? weather.humidityPct : null,
    });

    const previousLevel = zone.riskLevel;

    zone.elevationM = terrain.elevationAvailable ? terrain.elevationM : zone.elevationM;
    zone.elevationAvailable = terrain.elevationAvailable;
    zone.slopeDegrees = terrain.slopeAvailable ? terrain.slopeDegrees : zone.slopeDegrees;
    zone.slopeAvailable = terrain.slopeAvailable;
    zone.soilMoisturePct = soil.soilMoistureAvailable ? soil.soilMoisturePct : zone.soilMoisturePct;
    zone.soilMoistureAvailable = soil.soilMoistureAvailable;
    zone.riskScore = result.riskScore;
    zone.riskLevel = result.riskLevel;
    zone.inputsUsed = result.rawInputs;
    zone.lastCalculatedAt = new Date();
    zone.dataSource = [
      weather.available ? weather.source : null,
      terrain.elevationAvailable ? terrain.source : null,
      soil.soilMoistureAvailable ? soil.source : null,
    ]
      .filter(Boolean)
      .join(' + ') || 'unavailable';

    await zone.save();

    socketService.emitRiskUpdate({
      zoneId: zone._id,
      name: zone.name,
      riskScore: zone.riskScore,
      riskLevel: zone.riskLevel,
      lat,
      lon,
      previousLevel,
      changed: previousLevel !== zone.riskLevel,
    });

    if (zone.riskLevel === 'HIGH' || zone.riskLevel === 'CRITICAL') {
      await alertsController.createAlertInternal({
        riskLevel: zone.riskLevel,
        riskScore: zone.riskScore,
        lat,
        lon,
        riskZoneId: zone._id,
        message: `${zone.riskLevel} landslide risk detected at ${zone.name}.`,
      });
    }
  } catch (err) {
    console.error(`[riskZoneRefresher] failed to refresh zone ${zone.name}:`, err.message);
  }
}

async function refreshAllZones() {
  const zones = await RiskZone.find({ active: true });
  console.log(`[riskZoneRefresher] refreshing ${zones.length} zone(s)...`);
  for (const zone of zones) {
    await refreshZone(zone);
  }
}

function startScheduledRefresh() {
  refreshAllZones().catch((err) => console.error('[riskZoneRefresher] startup refresh error:', err.message));

  // Every 15 minutes -- adjust to match how often weather/rainfall meaningfully changes.
  cron.schedule('*/15 * * * *', () => {
    refreshAllZones().catch((err) => console.error('[riskZoneRefresher] cron error:', err.message));
  });
  console.log('[riskZoneRefresher] scheduled every 15 minutes and refreshed on startup');
}

module.exports = { refreshAllZones, startScheduledRefresh };
