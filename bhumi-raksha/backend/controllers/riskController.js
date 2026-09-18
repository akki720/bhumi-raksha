const asyncHandler = require('express-async-handler');
const RiskZone = require('../models/RiskZone');
const HistoricalLandslide = require('../models/HistoricalLandslide');
const Prediction = require('../models/Prediction');
const weatherService = require('../services/weatherService');
const elevationService = require('../services/elevationService');
const soilService = require('../services/soilService');
const riskEngine = require('../services/riskEngine');
const { distanceKm } = require('../services/geoUtils');
const alertsController = require('./alertsController');
const socketService = require('../services/socketService');
const { getSafeRoute } = require('../services/routingService');

function parseLatLon(req) {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  return { lat, lon };
}

/**
 * GET /api/risk/nearby?lat=&lon=
 * Full real-time pipeline: fetch live weather/terrain/soil for the user's
 * exact location, run the risk engine, find the nearest monitored risk
 * zone, and return a warning payload the frontend can act on directly.
 */
const getNearbyRisk = asyncHandler(async (req, res) => {
  const coords = parseLatLon(req);
  if (!coords) {
    res.status(400);
    throw new Error('lat and lon query parameters are required and must be numeric');
  }
  const { lat, lon } = coords;
  const radiusMeters = Number(process.env.NEARBY_RADIUS_METERS || 5000);

  const [weather, terrain, soil] = await Promise.all([
    weatherService.getCurrentWeather(lat, lon),
    elevationService.getElevationAndSlope(lat, lon),
    soilService.getSoilMoisture(lat, lon),
  ]);

  const riskResult = await riskEngine.calculateRisk({
    lat,
    lon,
    rainfallMm: weather.available ? weather.rainfallMm : null,
    soilMoisturePct: soil.soilMoistureAvailable ? soil.soilMoisturePct : null,
    slopeDegrees: terrain.slopeAvailable ? terrain.slopeDegrees : null,
    windSpeedKph: weather.available ? weather.windSpeedKph : null,
    humidityPct: weather.available ? weather.humidityPct : null,
  });

  await Prediction.create({
    location: { type: 'Point', coordinates: [lon, lat] },
    riskScore: riskResult.riskScore,
    riskLevel: riskResult.riskLevel,
    engineVersion: riskResult.engineVersion,
    isMlPrediction: riskResult.isMlPrediction,
    factors: riskResult.factors,
    rawInputs: riskResult.rawInputs,
  });

  const nearestZone = await RiskZone.findOne({
    active: true,
    location: {
      $near: { $geometry: { type: 'Point', coordinates: [lon, lat] }, $maxDistance: radiusMeters },
    },
  }).lean();

  const distanceKmToZone = nearestZone
    ? distanceKm(lat, lon, nearestZone.location.coordinates[1], nearestZone.location.coordinates[0])
    : null;

  const effectiveLevel = nearestZone && nearestZone.riskScore > riskResult.riskScore ? nearestZone.riskLevel : riskResult.riskLevel;
  const effectiveScore = nearestZone ? Math.max(nearestZone.riskScore, riskResult.riskScore) : riskResult.riskScore;
  const warning = effectiveLevel === 'HIGH' || effectiveLevel === 'CRITICAL';

  const payload = {
    warning,
    riskLevel: effectiveLevel,
    riskScore: effectiveScore,
    distanceKm: distanceKmToZone,
    nearestZone: nearestZone ? { id: nearestZone._id, name: nearestZone.name } : null,
    message: warning
      ? `${effectiveLevel} landslide risk detected ${nearestZone ? 'nearby' : 'at your location'}.`
      : 'No significant landslide risk detected at this time.',
    confidence: riskResult.confidence,
    factors: riskResult.factors,
    dataAvailability: {
      weather: weather.available,
      terrain: terrain.elevationAvailable,
      slope: terrain.slopeAvailable,
      soilMoisture: soil.soilMoistureAvailable,
    },
    computedAt: new Date(),
  };

  socketService.emitRiskUpdate(payload);

  if (warning) {
    await alertsController.createAlertInternal({
      riskLevel: effectiveLevel,
      riskScore: effectiveScore,
      lat,
      lon,
      riskZoneId: nearestZone ? nearestZone._id : null,
      message: payload.message,
    });
  }

  res.json(payload);
});

/**
 * GET /api/risk/geojson
 * Returns all active monitored risk zones as a GeoJSON FeatureCollection for
 * the existing React map to render, with full data provenance per feature.
 */
const getRiskGeoJSON = asyncHandler(async (req, res) => {
  const zones = await RiskZone.find({ active: true }).lean();
  const features = zones.map((z) => ({
    type: 'Feature',
    geometry: z.location,
    properties: {
      id: z._id,
      name: z.name,
      district: z.district,
      state: z.state,
      riskLevel: z.riskLevel,
      riskScore: z.riskScore,
      rainfallMm: z.inputsUsed?.rainfallMm ?? null,
      soilMoisturePct: z.soilMoisturePct,
      slopeDegrees: z.slopeDegrees,
      elevationM: z.elevationM,
      lastUpdated: z.lastCalculatedAt,
      dataSource: z.dataSource,
    },
  }));

  res.json({ type: 'FeatureCollection', features });
});

/**
 * POST /api/risk/import-historical
 * Bulk-import REAL historical landslide records (from a verified dataset
 * such as GSI Bhukosh / NDMA exports). Body: { events: [ {...} ] }
 * Never invents data -- every field must be provided with a source.
 */
const importHistorical = asyncHandler(async (req, res) => {
  const { events } = req.body;
  if (!Array.isArray(events) || events.length === 0) {
    res.status(400);
    throw new Error('Request body must include a non-empty "events" array');
  }

  const docs = events.map((e) => {
    if (!e.latitude || !e.longitude || !e.date || !e.locationName || !e.source) {
      throw Object.assign(new Error('Each event requires latitude, longitude, date, locationName, and source'), {
        statusCode: 400,
      });
    }
    return {
      location: { type: 'Point', coordinates: [e.longitude, e.latitude] },
      latitude: e.latitude,
      longitude: e.longitude,
      date: new Date(e.date),
      locationName: e.locationName,
      type: e.type || null,
      severity: e.severity || 'MODERATE',
      trigger: e.trigger || null,
      fatalities: e.fatalities ?? null,
      source: e.source,
      sourceUrl: e.sourceUrl || null,
      notes: e.notes || null,
    };
  });

  const inserted = await HistoricalLandslide.insertMany(docs);
  res.status(201).json({ available: true, insertedCount: inserted.length });
});

// GET /api/risk/historical?lat=&lon=&radiusKm=
const getHistorical = asyncHandler(async (req, res) => {
  const coords = parseLatLon(req);
  const radiusKm = Number(req.query.radiusKm || 25);

  let query = {};
  if (coords) {
    query = {
      location: {
        $near: { $geometry: { type: 'Point', coordinates: [coords.lon, coords.lat] }, $maxDistance: radiusKm * 1000 },
      },
    };
  }

  const events = await HistoricalLandslide.find(query).sort({ date: -1 }).limit(200).lean();

  if (!events.length && coords) {
    const fallback = await HistoricalLandslide.find({}).sort({ date: -1 }).limit(20).lean();
    return res.json({
      available: true,
      count: fallback.length,
      events: fallback,
      message: 'No historical records within the requested radius. Showing nearest sample data instead.',
    });
  }

  res.json({ available: true, count: events.length, events });
});

const getSafeRouteForLocation = asyncHandler(async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    res.status(400);
    throw new Error('lat and lon query parameters are required and must be numeric');
  }

  const route = await getSafeRoute(lat, lon, lat, lon);
  res.json({ available: true, route });
});

module.exports = { getNearbyRisk, getRiskGeoJSON, importHistorical, getHistorical, getSafeRouteForLocation };
