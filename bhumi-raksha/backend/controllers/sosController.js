const asyncHandler = require('express-async-handler');
const SOS = require('../models/SOS');
const SafePlace = require('../models/SafePlace');
const riskEngine = require('../services/riskEngine');
const weatherService = require('../services/weatherService');
const elevationService = require('../services/elevationService');
const soilService = require('../services/soilService');

const createSOS = asyncHandler(async (req, res) => {
  const { latitude, longitude, name, phone, source } = req.body;

  if (latitude === undefined || longitude === undefined) {
    res.status(400);
    throw new Error('latitude and longitude are required');
  }

  const lat = Number(latitude);
  const lon = Number(longitude);

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

  const nearestSafeZone = await SafePlace.findOne({
    verified: true,
    location: {
      $near: { $geometry: { type: 'Point', coordinates: [lon, lat] }, $maxDistance: 20000 },
    },
  }).sort({ createdAt: 1 }).lean();

  const sos = await SOS.create({
    user: req.user ? req.user._id : null,
    name: name || (req.user ? req.user.name : 'Anonymous'),
    phone: phone || null,
    status: 'ACTIVE',
    severity: riskResult.riskLevel,
    location: { type: 'Point', coordinates: [lon, lat] },
    latitude: lat,
    longitude: lon,
    nearestSafeZone: nearestSafeZone ? nearestSafeZone._id : null,
    nearestSafeZoneName: nearestSafeZone ? nearestSafeZone.name : null,
    riskLevel: riskResult.riskLevel,
    riskScore: riskResult.riskScore,
    message: riskResult.riskLevel === 'CRITICAL' ? 'Critical landslide risk. Move to the nearest verified safe zone immediately.' : 'Emergency assistance requested. Stay alert.',
    emergencyContacts: ['112', '108', 'District Control Room'],
    source: source || 'mobile',
  });

  res.status(201).json({
    available: true,
    sos,
    nearestSafeZone,
    risk: riskResult,
  });
});

const getSOS = asyncHandler(async (req, res) => {
  const sos = await SOS.find().sort({ createdAt: -1 }).limit(50).lean();
  res.json({ available: true, count: sos.length, sos });
});

const resolveSOS = asyncHandler(async (req, res) => {
  const sos = await SOS.findById(req.params.id);
  if (!sos) {
    res.status(404);
    throw new Error('SOS record not found');
  }

  sos.status = 'RESOLVED';
  await sos.save();
  res.json({ available: true, sos });
});

module.exports = { createSOS, getSOS, resolveSOS };
