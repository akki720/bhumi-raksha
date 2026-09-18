const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    type: { type: String, default: 'LANDSLIDE_RISK' },
    riskZone: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskZone', default: null },
    riskLevel: { type: String, enum: ['HIGH', 'CRITICAL'], required: true },
    riskScore: { type: Number, required: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    message: { type: String, required: true },
    affectedRadiusKm: { type: Number, default: 5 },
    acknowledged: { type: Boolean, default: false },
    resolvedAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

alertSchema.index({ location: '2dsphere' });
alertSchema.index({ active: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
