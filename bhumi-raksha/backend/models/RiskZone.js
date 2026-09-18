const mongoose = require('mongoose');

// A risk zone is a real geographic point/area being monitored. It holds the
// latest computed risk score plus the raw inputs used to compute it so the
// GeoJSON endpoint and dashboard can display full provenance.
const riskZoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    district: { type: String, default: null },
    state: { type: String, default: 'NER' },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    elevationM: { type: Number, default: null },
    elevationAvailable: { type: Boolean, default: false },
    slopeDegrees: { type: Number, default: null },
    slopeAvailable: { type: Boolean, default: false },
    soilType: { type: String, default: null },
    soilMoisturePct: { type: Number, default: null },
    soilMoistureAvailable: { type: Boolean, default: false },
    riskScore: { type: Number, default: 0, min: 0, max: 100 },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'],
      default: 'LOW',
    },
    inputsUsed: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastCalculatedAt: { type: Date, default: null },
    dataSource: { type: String, default: 'mixed' },
    active: { type: Boolean, default: true },
    populationEstimate: { type: Number, default: null }, // only set if a real census/local figure is known
  },
  { timestamps: true }
);

riskZoneSchema.index({ location: '2dsphere' });
riskZoneSchema.index({ riskLevel: 1, active: 1 });

module.exports = mongoose.model('RiskZone', riskZoneSchema);
