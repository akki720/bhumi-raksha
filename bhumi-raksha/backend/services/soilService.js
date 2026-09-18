const axios = require('axios');

/**
 * Real soil moisture via Open-Meteo's weather-model soil variables (no key
 * required) -- https://open-meteo.com/en/docs (hourly: soil_moisture_0_to_1cm).
 * Soil TYPE has no reliable free real-time API; unless SOILGRIDS is wired in
 * this returns soilType: null / soilTypeAvailable: false rather than a guess.
 */
async function getSoilMoisture(lat, lon) {
  try {
    const { data } = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat,
        longitude: lon,
        hourly: 'soil_moisture_0_to_1cm,soil_temperature_0cm',
        forecast_days: 1,
        timezone: 'auto',
      },
      timeout: 10000,
    });

    const hourly = data.hourly;
    if (!hourly || !Array.isArray(hourly.soil_moisture_0_to_1cm)) {
      throw new Error('soil moisture field missing in provider response');
    }

    // Use the most recent past/current hour available
    const nowIdx = Math.max(
      0,
      hourly.time.findIndex((t) => new Date(t) > new Date()) - 1
    );
    const moistureM3m3 = hourly.soil_moisture_0_to_1cm[nowIdx] ?? hourly.soil_moisture_0_to_1cm[0];
    const soilTempC = hourly.soil_temperature_0cm ? hourly.soil_temperature_0cm[nowIdx] : null;

    return {
      soilMoistureAvailable: moistureM3m3 !== null && moistureM3m3 !== undefined,
      soilMoisturePct: moistureM3m3 != null ? Math.round(moistureM3m3 * 100 * 100) / 100 : null, // m3/m3 -> %
      soilTemperatureC: soilTempC,
      soilTypeAvailable: false,
      soilType: null,
      source: 'open-meteo (soil layer model)',
      sourceUrl: 'https://open-meteo.com/',
      retrievedAt: new Date(),
    };
  } catch (err) {
    console.error('[soilService] fetch failed:', err.message);
    return {
      soilMoistureAvailable: false,
      soilMoisturePct: null,
      soilTypeAvailable: false,
      soilType: null,
      message: 'Live soil moisture data currently unavailable',
    };
  }
}

module.exports = { getSoilMoisture };
