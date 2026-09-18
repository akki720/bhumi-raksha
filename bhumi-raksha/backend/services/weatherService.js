const axios = require('axios');
const WeatherData = require('../models/WeatherData');

const CACHE_TTL_MIN = Number(process.env.WEATHER_CACHE_TTL_MIN || 15);

/**
 * Fetches REAL current weather + rainfall from Open-Meteo (no API key required).
 * Docs: https://open-meteo.com/en/docs
 * If OWM_API_KEY is set and WEATHER_PROVIDER=openweathermap, uses OpenWeatherMap instead.
 */
async function fetchCurrentFromOpenMeteo(lat, lon) {
  const url = 'https://api.open-meteo.com/v1/forecast';
  const { data } = await axios.get(url, {
    params: {
      latitude: lat,
      longitude: lon,
      current: [
        'temperature_2m',
        'relative_humidity_2m',
        'precipitation',
        'rain',
        'pressure_msl',
        'wind_speed_10m',
      ].join(','),
      timezone: 'auto',
    },
    timeout: 10000,
  });

  const c = data.current || {};
  return {
    rainfallMm: typeof c.rain === 'number' ? c.rain : (c.precipitation ?? null),
    precipitationProbability: null,
    temperatureC: c.temperature_2m ?? null,
    humidityPct: c.relative_humidity_2m ?? null,
    pressureHpa: c.pressure_msl ?? null,
    windSpeedKph: typeof c.wind_speed_10m === 'number' ? c.wind_speed_10m * 3.6 : null,
    observedAt: c.time ? new Date(c.time) : new Date(),
    source: 'open-meteo',
    sourceUrl: 'https://open-meteo.com/',
  };
}

async function fetchForecastFromOpenMeteo(lat, lon) {
  const url = 'https://api.open-meteo.com/v1/forecast';
  const { data } = await axios.get(url, {
    params: {
      latitude: lat,
      longitude: lon,
      daily: ['precipitation_sum', 'precipitation_probability_max', 'temperature_2m_max', 'temperature_2m_min'].join(','),
      hourly: ['precipitation', 'precipitation_probability', 'temperature_2m', 'relative_humidity_2m'].join(','),
      forecast_days: 5,
      timezone: 'auto',
    },
    timeout: 10000,
  });

  return {
    forecast: {
      daily: data.daily || null,
      hourly: data.hourly || null,
    },
    observedAt: new Date(),
    source: 'open-meteo',
    sourceUrl: 'https://open-meteo.com/',
  };
}

async function fetchCurrentFromOpenWeatherMap(lat, lon) {
  const key = process.env.OWM_API_KEY;
  if (!key) throw new Error('OWM_API_KEY not configured');
  const url = 'https://api.openweathermap.org/data/2.5/weather';
  const { data } = await axios.get(url, {
    params: { lat, lon, appid: key, units: 'metric' },
    timeout: 10000,
  });
  return {
    rainfallMm: data.rain ? (data.rain['1h'] ?? data.rain['3h'] ?? 0) : 0,
    precipitationProbability: null,
    temperatureC: data.main?.temp ?? null,
    humidityPct: data.main?.humidity ?? null,
    pressureHpa: data.main?.pressure ?? null,
    windSpeedKph: typeof data.wind?.speed === 'number' ? data.wind.speed * 3.6 : null,
    observedAt: data.dt ? new Date(data.dt * 1000) : new Date(),
    source: 'openweathermap',
    sourceUrl: 'https://openweathermap.org/',
  };
}

/**
 * Returns current weather for a coordinate. Tries live API; falls back to the
 * latest cached record within CACHE_TTL_MIN if the API call fails. Never
 * fabricates data -- returns { available: false } if nothing usable exists.
 */
async function getCurrentWeather(lat, lon) {
  const provider = process.env.WEATHER_PROVIDER || 'open-meteo';
  try {
    const result =
      provider === 'openweathermap'
        ? await fetchCurrentFromOpenWeatherMap(lat, lon)
        : await fetchCurrentFromOpenMeteo(lat, lon);

    const doc = await WeatherData.create({
      location: { type: 'Point', coordinates: [lon, lat] },
      latitude: lat,
      longitude: lon,
      kind: 'current',
      ...result,
      retrievedAt: new Date(),
    });

    return { available: true, ...doc.toObject() };
  } catch (err) {
    console.error('[weatherService] live fetch failed:', err.message);
    const cutoff = new Date(Date.now() - CACHE_TTL_MIN * 60 * 1000);
    const cached = await WeatherData.findOne({
      latitude: { $gte: lat - 0.05, $lte: lat + 0.05 },
      longitude: { $gte: lon - 0.05, $lte: lon + 0.05 },
      kind: 'current',
    })
      .sort({ retrievedAt: -1 })
      .lean();

    if (cached) {
      return { available: true, ...cached, stale: cached.retrievedAt < cutoff };
    }
    return { available: false, message: 'Live data currently unavailable' };
  }
}

async function getForecast(lat, lon) {
  const provider = process.env.WEATHER_PROVIDER || 'open-meteo';
  try {
    if (provider === 'openweathermap' && !process.env.OWM_API_KEY) {
      throw new Error('OWM_API_KEY not configured, falling back not implemented for forecast');
    }
    const result = await fetchForecastFromOpenMeteo(lat, lon);

    const doc = await WeatherData.create({
      location: { type: 'Point', coordinates: [lon, lat] },
      latitude: lat,
      longitude: lon,
      kind: 'forecast',
      ...result,
      retrievedAt: new Date(),
    });

    return { available: true, ...doc.toObject() };
  } catch (err) {
    console.error('[weatherService] forecast fetch failed:', err.message);
    const cached = await WeatherData.findOne({
      latitude: { $gte: lat - 0.05, $lte: lat + 0.05 },
      longitude: { $gte: lon - 0.05, $lte: lon + 0.05 },
      kind: 'forecast',
    })
      .sort({ retrievedAt: -1 })
      .lean();

    if (cached) return { available: true, ...cached, stale: true };
    return { available: false, message: 'Live data currently unavailable' };
  }
}

module.exports = { getCurrentWeather, getForecast };
