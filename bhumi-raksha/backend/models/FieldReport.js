const mongoose = require('mongoose');

const fieldReportSchema = new mongoose.Schema(
  {
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    reportType: {
      type: String,
      enum: ['CRACK', 'DEBRIS', 'WATER_SEEPAGE', 'GROUND_MOVEMENT', 'SLOPE_FAILURE', 'OTHER'],
      required: true,
    },
    description: { type: String, required: true },
    severity: {
      type: String,
      enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'],
      required: true,
    },
    imageUrl: { type: String, default: null },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reporterName: { type: String, default: 'Anonymous' },
    reporterContact: { type: String, default: null },
    status: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING',
    },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedAt: { type: Date, default: null },
    contributedToRisk: { type: Boolean, default: false },
  },
  { timestamps: true }
);

fieldReportSchema.index({ location: '2dsphere' });
fieldReportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('FieldReport', fieldReportSchema);
