const asyncHandler = require('express-async-handler');
const weatherService = require('../services/weatherService');
const socketService = require('../services/socketService');

function parseLatLon(req) {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  return { lat, lon };
}

// GET /api/weather/current?lat=&lon=
const getCurrent = asyncHandler(async (req, res) => {
  const coords = parseLatLon(req);
  if (!coords) {
    res.status(400);
    throw new Error('lat and lon query parameters are required and must be numeric');
  }
  const result = await weatherService.getCurrentWeather(coords.lat, coords.lon);
  if (result.available) {
    socketService.emitWeatherUpdate({ lat: coords.lat, lon: coords.lon, kind: 'current', data: result });
  }
  res.json(result);
});

// GET /api/weather/forecast?lat=&lon=
const getForecast = asyncHandler(async (req, res) => {
  const coords = parseLatLon(req);
  if (!coords) {
    res.status(400);
    throw new Error('lat and lon query parameters are required and must be numeric');
  }
  const result = await weatherService.getForecast(coords.lat, coords.lon);
  res.json(result);
});

module.exports = { getCurrent, getForecast };
