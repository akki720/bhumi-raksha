const asyncHandler = require('express-async-handler');
const FieldReport = require('../models/FieldReport');
const socketService = require('../services/socketService');

const queueOfflineReport = asyncHandler(async (req, res) => {
  const { report } = req.body;
  if (!report) {
    res.status(400);
    throw new Error('Offline report payload is required');
  }

  const { latitude, longitude, reportType, description, severity, reporterName, reporterContact } = report;
  if (!latitude || !longitude || !reportType || !description || !severity) {
    res.status(400);
    throw new Error('Queued report is missing required fields');
  }

  const savedReport = await FieldReport.create({
    location: { type: 'Point', coordinates: [Number(longitude), Number(latitude)] },
    latitude: Number(latitude),
    longitude: Number(longitude),
    reportType,
    description,
    severity,
    reporterName: reporterName || 'Anonymous',
    reporterContact: reporterContact || null,
    status: 'PENDING',
  });

  socketService.emitNewReport(savedReport);
  res.status(201).json({ available: true, synced: true, report: savedReport });
});

module.exports = { queueOfflineReport };
