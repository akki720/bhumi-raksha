const mongoose = require('mongoose');

// Stores real weather/rainfall observations and forecasts fetched from an
// external provider (Open-Meteo by default). Never populated with random data.
const weatherDataSchema = new mongoose.Schema(
  {
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    kind: { type: String, enum: ['current', 'forecast'], required: true },
    rainfallMm: { type: Number, default: null },
    precipitationProbability: { type: Number, default: null },
    temperatureC: { type: Number, default: null },
    humidityPct: { type: Number, default: null },
    pressureHpa: { type: Number, default: null },
    windSpeedKph: { type: Number, default: null },
    forecast: { type: mongoose.Schema.Types.Mixed, default: null }, // raw forecast array when kind=forecast
    source: { type: String, required: true }, // e.g. "open-meteo"
    sourceUrl: { type: String, default: null },
    observedAt: { type: Date, required: true }, // timestamp reported by the provider
    retrievedAt: { type: Date, default: Date.now }, // when our backend fetched it
  },
  { timestamps: true }
);

weatherDataSchema.index({ location: '2dsphere' });
weatherDataSchema.index({ latitude: 1, longitude: 1, kind: 1, retrievedAt: -1 });

module.exports = mongoose.model('WeatherData', weatherDataSchema);
