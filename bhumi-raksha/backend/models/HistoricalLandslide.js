const mongoose = require('mongoose');

// Real historical landslide events, imported from verified datasets
// (e.g. NRSC/GSI Bhukosh, ISRO, state disaster management records, NDMA).
// These are never invented; import via the /api/risk/import-historical route
// or seed script.
const historicalLandslideSchema = new mongoose.Schema(
  {
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    date: { type: Date, required: true },
    locationName: { type: String, required: true },
    type: { type: String, default: null }, // e.g. debris flow, rockfall, slump
    severity: {
      type: String,
      enum: ['MINOR', 'MODERATE', 'SEVERE', 'CATASTROPHIC'],
      default: 'MODERATE',
    },
    trigger: { type: String, default: null }, // e.g. heavy rainfall, earthquake, construction
    fatalities: { type: Number, default: null },
    source: { type: String, required: true }, // e.g. "GSI Bhukosh", "NDMA report"
    sourceUrl: { type: String, default: null },
    notes: { type: String, default: null },
  },
  { timestamps: true }
);

historicalLandslideSchema.index({ location: '2dsphere' });
historicalLandslideSchema.index({ date: -1 });

module.exports = mongoose.model('HistoricalLandslide', historicalLandslideSchema);
