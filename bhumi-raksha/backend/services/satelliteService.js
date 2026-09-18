/**
 * Architecture for real satellite / earth-observation data integration
 * (e.g. Copernicus/Sentinel via the Copernicus Data Space Ecosystem, NASA
 * SMAP soil moisture, MODIS/VIIRS NDVI for vegetation/land-cover).
 *
 * These providers require registration/API credentials and, for some, an
 * OAuth token flow -- they are NOT wired to a live call yet. This module
 * defines the contract other services (riskEngine, controllers) rely on so
 * that plugging in real credentials later requires no changes elsewhere.
 *
 * IMPORTANT: this must never claim data is "live" unless a real request
 * actually succeeded. Until credentials are added below, every field is
 * explicitly marked unavailable.
 */

const isConfigured = () => Boolean(process.env.COPERNICUS_CLIENT_ID && process.env.COPERNICUS_CLIENT_SECRET);

async function getVegetationIndex(lat, lon) {
  if (!isConfigured()) {
    return {
      available: false,
      message: 'Satellite vegetation/NDVI integration not configured (requires Copernicus/NASA credentials)',
    };
  }
  // TODO: implement real Sentinel-2 NDVI request via Copernicus Data Space Ecosystem API
  // once COPERNICUS_CLIENT_ID / COPERNICUS_CLIENT_SECRET are provided.
  throw new Error('Satellite provider configured but request implementation pending');
}

async function getSatelliteSoilMoisture(lat, lon) {
  if (!isConfigured()) {
    return {
      available: false,
      message: 'Satellite soil moisture (NASA SMAP) integration not configured',
    };
  }
  throw new Error('Satellite provider configured but request implementation pending');
}

async function getSatelliteRainfallEstimate(lat, lon) {
  if (!isConfigured()) {
    return {
      available: false,
      message: 'Satellite rainfall estimate (e.g. GPM IMERG) integration not configured',
    };
  }
  throw new Error('Satellite provider configured but request implementation pending');
}

module.exports = {
  isConfigured,
  getVegetationIndex,
  getSatelliteSoilMoisture,
  getSatelliteRainfallEstimate,
};
