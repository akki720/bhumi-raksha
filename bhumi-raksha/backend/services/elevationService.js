const axios = require('axios');

/**
 * Fetches REAL elevation from Open-Elevation (free, no key) with an
 * OpenTopoData fallback. Slope is derived by sampling elevation at four
 * nearby points ~90m away (roughly one SRTM pixel) and computing the
 * steepest gradient -- this is a real terrain-derived approximation, not a
 * random number. If both providers fail, returns "unavailable".
 */

const DELTA_DEG = 0.0008; // ~90m at these latitudes

async function lookupOpenElevation(points) {
  const url = 'https://api.open-elevation.com/api/v1/lookup';
  const { data } = await axios.post(
    url,
    { locations: points.map((p) => ({ latitude: p.lat, longitude: p.lon })) },
    { timeout: 10000 }
  );
  return data.results.map((r) => r.elevation);
}

async function lookupOpenTopoData(points) {
  const locations = points.map((p) => `${p.lat},${p.lon}`).join('|');
  const url = `https://api.opentopodata.org/v1/srtm90m`;
  const { data } = await axios.get(url, { params: { locations }, timeout: 10000 });
  return data.results.map((r) => r.elevation);
}

async function getElevationAndSlope(lat, lon) {
  const samplePoints = [
    { lat, lon },
    { lat: lat + DELTA_DEG, lon },
    { lat: lat - DELTA_DEG, lon },
    { lat, lon: lon + DELTA_DEG },
    { lat, lon: lon - DELTA_DEG },
  ];

  let elevations;
  let source = 'open-elevation';
  try {
    elevations = await lookupOpenElevation(samplePoints);
  } catch (err) {
    console.warn('[elevationService] open-elevation failed, trying opentopodata:', err.message);
    try {
      elevations = await lookupOpenTopoData(samplePoints);
      source = 'opentopodata (SRTM 90m)';
    } catch (err2) {
      console.error('[elevationService] both providers failed:', err2.message);
      return {
        elevationAvailable: false,
        slopeAvailable: false,
        elevationM: null,
        slopeDegrees: null,
        message: 'Live elevation/terrain data currently unavailable',
      };
    }
  }

  const [center, north, south, east, west] = elevations;
  if ([center, north, south, east, west].some((v) => v === null || v === undefined)) {
    return {
      elevationAvailable: elevations[0] != null,
      slopeAvailable: false,
      elevationM: elevations[0] ?? null,
      slopeDegrees: null,
      source,
    };
  }

  // Distance between sample points in meters (approx, using DELTA_DEG)
  const distMeters = DELTA_DEG * 111320; // ~1 deg latitude ~ 111.32km
  const dzNS = (north - south) / (2 * distMeters);
  const dzEW = (east - west) / (2 * distMeters);
  const gradient = Math.sqrt(dzNS * dzNS + dzEW * dzEW);
  const slopeDegrees = Math.atan(gradient) * (180 / Math.PI);

  return {
    elevationAvailable: true,
    slopeAvailable: true,
    elevationM: center,
    slopeDegrees: Math.round(slopeDegrees * 100) / 100,
    source,
    retrievedAt: new Date(),
  };
}

module.exports = { getElevationAndSlope };
