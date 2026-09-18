const mongoose = require('mongoose');

const safePlaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ['EMERGENCY_CENTER', 'HOSPITAL', 'SHELTER', 'POLICE_STATION', 'GOVERNMENT_FACILITY'],
      required: true,
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: { type: String, default: null },
    contactNumber: { type: String, default: null },
    capacity: { type: Number, default: null },
    verified: { type: Boolean, default: false },
    source: { type: String, default: 'manual' }, // e.g. "OpenStreetMap", "district admin"
  },
  { timestamps: true }
);

safePlaceSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('SafePlace', safePlaceSchema);
