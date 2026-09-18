const mongoose = require('mongoose');

// A snapshot of a risk computation at a point in time. This is what the
// "AI Explainability" screen reads from -- it stores which factors and
// weights contributed to the score so the frontend can show a real
// breakdown instead of a fabricated explanation.
const predictionSchema = new mongoose.Schema(
  {
    riskZone: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskZone', default: null },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    riskScore: { type: Number, required: true },
    riskLevel: { type: String, enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'], required: true },
    engineVersion: { type: String, default: 'rule-based-v1' }, // becomes "ml-v1" once a trained model is wired in
    isMlPrediction: { type: Boolean, default: false },
    factors: [
      {
        name: String, // e.g. "rainfall", "slope", "soilMoisture", "historicalFrequency"
        value: mongoose.Schema.Types.Mixed,
        weight: Number,
        contribution: Number,
        available: Boolean,
      },
    ],
    rawInputs: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

predictionSchema.index({ location: '2dsphere' });
predictionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Prediction', predictionSchema);
