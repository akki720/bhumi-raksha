const asyncHandler = require('express-async-handler');
const SafePlace = require('../models/SafePlace');
const { distanceKm } = require('../services/geoUtils');

// GET /api/safe-places/nearby?lat=&lon=&radiusKm=
const getNearbySafePlaces = asyncHandler(async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  const radiusKm = Number(req.query.radiusKm || 15);
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    res.status(400);
    throw new Error('lat and lon query parameters are required and must be numeric');
  }

  const places = await SafePlace.find({
    verified: true,
    location: {
      $near: { $geometry: { type: 'Point', coordinates: [lon, lat] }, $maxDistance: radiusKm * 1000 },
    },
  })
    .limit(30)
    .lean();

  const withDistance = places
    .map((p) => ({ ...p, distanceKm: distanceKm(lat, lon, p.latitude, p.longitude) }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  res.json({ available: true, count: withDistance.length, safePlaces: withDistance });
});

// GET /api/safe-places  (admin/listing view)
const getAllSafePlaces = asyncHandler(async (req, res) => {
  const places = await SafePlace.find().sort({ createdAt: -1 }).lean();
  res.json({ available: true, count: places.length, safePlaces: places });
});

// POST /api/safe-places  (admin adds a verified real facility)
const createSafePlace = asyncHandler(async (req, res) => {
  const { name, category, latitude, longitude, address, contactNumber, capacity, verified, source } = req.body;
  if (!name || !category || latitude == null || longitude == null) {
    res.status(400);
    throw new Error('name, category, latitude and longitude are required');
  }
  const place = await SafePlace.create({
    name,
    category,
    location: { type: 'Point', coordinates: [longitude, latitude] },
    latitude,
    longitude,
    address,
    contactNumber,
    capacity,
    verified: Boolean(verified),
    source: source || 'manual',
  });
  res.status(201).json({ available: true, safePlace: place });
});

module.exports = { getNearbySafePlaces, getAllSafePlaces, createSafePlace };
