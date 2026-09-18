const asyncHandler = require('express-async-handler');
const Alert = require('../models/Alert');
const RiskZone = require('../models/RiskZone');
const FieldReport = require('../models/FieldReport');
const HistoricalLandslide = require('../models/HistoricalLandslide');
const User = require('../models/User');

/**
 * GET /api/dashboard/stats
 * Every number here is computed live from MongoDB -- nothing hardcoded.
 * "People at risk" is an estimate only when population data per zone is
 * present on the RiskZone document (populationEstimate field); otherwise it
 * is reported as unavailable rather than guessed.
 */
const getStats = asyncHandler(async (req, res) => {
  const [
    activeAlerts,
    highRiskZones,
    criticalRiskZones,
    totalZones,
    fieldReportsCount,
    pendingReports,
    historicalCount,
    approvedAuthorities,
    pendingAuthorities,
  ] = await Promise.all([
    Alert.countDocuments({ active: true }),
    RiskZone.countDocuments({ active: true, riskLevel: 'HIGH' }),
    RiskZone.countDocuments({ active: true, riskLevel: 'CRITICAL' }),
    RiskZone.countDocuments({ active: true }),
    FieldReport.countDocuments(),
    FieldReport.countDocuments({ status: 'PENDING' }),
    HistoricalLandslide.countDocuments(),
    User.countDocuments({ role: 'authority', authorityApproved: true }),
    User.countDocuments({ role: 'authority', authorityApproved: false }),
  ]);

  const affectedZones = await RiskZone.find({ active: true, riskLevel: { $in: ['HIGH', 'CRITICAL'] } })
    .select('name district populationEstimate')
    .lean();

  const populationKnown = affectedZones.every((z) => typeof z.populationEstimate === 'number');
  const peopleAtRisk = populationKnown
    ? affectedZones.reduce((sum, z) => sum + z.populationEstimate, 0)
    : null;

  res.json({
    available: true,
    generatedAt: new Date(),
    stats: {
      activeAlerts,
      highRiskZones,
      criticalRiskZones,
      totalMonitoredZones: totalZones,
      affectedAreas: affectedZones.length,
      fieldReportsTotal: fieldReportsCount,
      fieldReportsPending: pendingReports,
      historicalEventsRecorded: historicalCount,
      pendingAuthorities,
      approvedAuthorities,
      peopleAtRisk: peopleAtRisk, // null => "unavailable" (no fabricated population estimate)
      peopleAtRiskAvailable: populationKnown,
      systemStatus: 'OPERATIONAL',
    },
  });
});

module.exports = { getStats };
