const asyncHandler = require('express-async-handler');
const FieldReport = require('../models/FieldReport');
const socketService = require('../services/socketService');
const alertsController = require('./alertsController');

// POST /api/reports  (multipart/form-data with optional "image" file)
const createReport = asyncHandler(async (req, res) => {
  const { latitude, longitude, reportType, description, severity, reporterName, reporterContact } = req.body;

  if (!latitude || !longitude || !reportType || !description || !severity) {
    res.status(400);
    throw new Error('latitude, longitude, reportType, description and severity are required');
  }

  const report = await FieldReport.create({
    location: { type: 'Point', coordinates: [Number(longitude), Number(latitude)] },
    latitude: Number(latitude),
    longitude: Number(longitude),
    reportType,
    description,
    severity,
    imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
    reporter: req.user ? req.user._id : null,
    reporterName: reporterName || (req.user ? req.user.name : 'Anonymous'),
    reporterContact: reporterContact || null,
    status: 'PENDING',
  });

  socketService.emitNewReport(report);
  res.status(201).json({ available: true, report });
});

// GET /api/reports?status=&lat=&lon=&radiusKm=
const getReports = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const query = {};
  if (status) query.status = status;

  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
    const radiusKm = Number(req.query.radiusKm || 20);
    query.location = {
      $near: { $geometry: { type: 'Point', coordinates: [lon, lat] }, $maxDistance: radiusKm * 1000 },
    };
  }

  const reports = await FieldReport.find(query).sort({ createdAt: -1 }).limit(200).lean();
  res.json({ available: true, count: reports.length, reports });
});

// GET /api/reports/:id
const getReportById = asyncHandler(async (req, res) => {
  const report = await FieldReport.findById(req.params.id).lean();
  if (!report) {
    res.status(404);
    throw new Error('Field report not found');
  }
  res.json({ available: true, report });
});

// PATCH /api/reports/:id/verify   body: { status: "VERIFIED" | "REJECTED" }
const verifyReport = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['VERIFIED', 'REJECTED'].includes(status)) {
    res.status(400);
    throw new Error('status must be VERIFIED or REJECTED');
  }

  const report = await FieldReport.findById(req.params.id);
  if (!report) {
    res.status(404);
    throw new Error('Field report not found');
  }

  report.status = status;
  report.verifiedBy = req.user ? req.user._id : null;
  report.verifiedAt = new Date();
  report.contributedToRisk = status === 'VERIFIED';
  await report.save();

  if (status === 'VERIFIED') {
    const riskBySeverity = { LOW: 35, MODERATE: 55, HIGH: 75, CRITICAL: 92 };
    const riskLevelByScore = { LOW: 'LOW', MODERATE: 'MODERATE', HIGH: 'HIGH', CRITICAL: 'CRITICAL' };
    const riskScore = riskBySeverity[report.severity] ?? 60;

    await alertsController.createAlertInternal({
      riskLevel: riskLevelByScore[report.severity] || 'MODERATE',
      riskScore,
      lat: report.latitude,
      lon: report.longitude,
      riskZoneId: null,
      message: `Verified ${report.severity.toLowerCase()} field report from ${report.reporterName || 'community source'} at ${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}.`,
    });
  }

  res.json({ available: true, report });
});

module.exports = { createReport, getReports, getReportById, verifyReport };
