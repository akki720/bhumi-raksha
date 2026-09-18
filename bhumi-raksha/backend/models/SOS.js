const mongoose = require('mongoose');

const sosSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, default: 'Anonymous' },
    phone: { type: String, default: null },
    status: {
      type: String,
      enum: ['ACTIVE', 'RESOLVED', 'CANCELLED'],
      default: 'ACTIVE',
    },
    severity: {
      type: String,
      enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'],
      default: 'CRITICAL',
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    nearestSafeZone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SafePlace',
      default: null,
    },
    nearestSafeZoneName: { type: String, default: null },
    riskLevel: { type: String, default: 'CRITICAL' },
    riskScore: { type: Number, default: 0 },
    message: { type: String, default: 'Emergency assistance requested' },
    emergencyContacts: [{ type: String, default: null }],
    source: { type: String, enum: ['mobile', 'web', 'admin'], default: 'mobile' },
  },
  { timestamps: true }
);

sosSchema.index({ location: '2dsphere' });
sosSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('SOS', sosSchema);
