const HistoricalLandslide = require('../models/HistoricalLandslide');
const FieldReport = require('../models/FieldReport');
const { distanceKm } = require('./geoUtils');

/**
 * RULE-BASED RISK ENGINE (engineVersion: "rule-based-v1")
 * ---------------------------------------------------------------
 * This is intentionally NOT machine learning. It is a transparent, weighted
 * scoring function over real inputs, built so it can be swapped for a
 * trained Python ML model later without changing any caller's contract:
 * every caller gets back { riskScore, riskLevel, factors[], engineVersion,
 * isMlPrediction }. To plug in a real model, implement mlRiskEngine.js with
 * the same exported function signature and swap the require() in
 * riskController.js.
 *
 * Any factor whose underlying data was unavailable is excluded from the
 * score and its weight is redistributed proportionally across the
 * available factors, rather than being defaulted to a fake value. This is
 * reflected in `confidence` (0-1): fewer available factors -> lower
 * confidence, surfaced to the frontend's AI Explainability screen.
 */

const BASE_WEIGHTS = {
  rainfall: 0.28,
  soilMoisture: 0.2,
  slope: 0.2,
  historicalFrequency: 0.15,
  weatherCondition: 0.07,
  fieldReports: 0.1,
};

function scoreRainfall(rainfallMm) {
  if (rainfallMm == null) return null;
  // Heavier rainfall in preceding hours strongly increases landslide risk.
  if (rainfallMm <= 0) return 5;
  if (rainfallMm < 2) return 20;
  if (rainfallMm < 10) return 45;
  if (rainfallMm < 30) return 70;
  if (rainfallMm < 60) return 88;
  return 100;
}

function scoreSoilMoisture(pct) {
  if (pct == null) return null;
  if (pct < 15) return 10;
  if (pct < 25) return 30;
  if (pct < 35) return 55;
  if (pct < 45) return 78;
  return 95;
}

function scoreSlope(deg) {
  if (deg == null) return null;
  if (deg < 5) return 5;
  if (deg < 15) return 25;
  if (deg < 25) return 50;
  if (deg < 35) return 75;
  return 95;
}

function scoreWeather(windKph, humidityPct) {
  if (windKph == null && humidityPct == null) return null;
  let s = 0;
  let n = 0;
  if (windKph != null) {
    s += Math.min(100, (windKph / 60) * 100);
    n += 1;
  }
  if (humidityPct != null) {
    s += humidityPct; // already 0-100
    n += 1;
  }
  return n ? s / n : null;
}

async function scoreHistorical(lat, lon, radiusKm = 10) {
  const events = await HistoricalLandslide.find({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lon, lat] },
        $maxDistance: radiusKm * 1000,
      },
    },
  })
    .limit(50)
    .lean();

  if (events.length === 0) return { score: 5, count: 0 };

  const now = Date.now();
  const fiveYearsMs = 5 * 365 * 24 * 60 * 60 * 1000;
  const recentCount = events.filter((e) => now - new Date(e.date).getTime() < fiveYearsMs).length;
  const severeCount = events.filter((e) => e.severity === 'SEVERE' || e.severity === 'CATASTROPHIC').length;

  let score = Math.min(100, events.length * 6 + recentCount * 10 + severeCount * 8);
  return { score, count: events.length, recentCount, severeCount };
}

async function scoreFieldReports(lat, lon, radiusKm = 3) {
  const reports = await FieldReport.find({
    status: 'VERIFIED',
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lon, lat] },
        $maxDistance: radiusKm * 1000,
      },
    },
    createdAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }, // last 14 days
  })
    .limit(50)
    .lean();

  if (reports.length === 0) return { score: 0, count: 0 };

  const severityScore = { LOW: 15, MODERATE: 40, HIGH: 70, CRITICAL: 95 };
  const maxSeverity = reports.reduce((max, r) => Math.max(max, severityScore[r.severity] || 0), 0);
  const countBoost = Math.min(20, reports.length * 4);
  return { score: Math.min(100, maxSeverity + countBoost), count: reports.length };
}

function levelForScore(score) {
  const moderate = Number(process.env.RISK_THRESHOLD_MODERATE || 40);
  const high = Number(process.env.RISK_THRESHOLD_HIGH || 65);
  const critical = Number(process.env.RISK_THRESHOLD_CRITICAL || 85);
  if (score >= critical) return 'CRITICAL';
  if (score >= high) return 'HIGH';
  if (score >= moderate) return 'MODERATE';
  return 'LOW';
}

/**
 * @param {Object} inputs
 * @param {number} inputs.lat
 * @param {number} inputs.lon
 * @param {number|null} inputs.rainfallMm
 * @param {number|null} inputs.soilMoisturePct
 * @param {number|null} inputs.slopeDegrees
 * @param {number|null} inputs.windSpeedKph
 * @param {number|null} inputs.humidityPct
 */
async function calculateRisk(inputs) {
  const { lat, lon, rainfallMm, soilMoisturePct, slopeDegrees, windSpeedKph, humidityPct } = inputs;

  const historical = await scoreHistorical(lat, lon);
  const fieldReportsResult = await scoreFieldReports(lat, lon);

  const rawScores = {
    rainfall: scoreRainfall(rainfallMm),
    soilMoisture: scoreSoilMoisture(soilMoisturePct),
    slope: scoreSlope(slopeDegrees),
    historicalFrequency: historical.score,
    weatherCondition: scoreWeather(windSpeedKph, humidityPct),
    fieldReports: fieldReportsResult.score,
  };

  const availableFactors = Object.entries(rawScores).filter(([, v]) => v !== null);
  const totalAvailableWeight = availableFactors.reduce((sum, [k]) => sum + BASE_WEIGHTS[k], 0);

  const factors = [];
  let weightedScore = 0;

  for (const [key, value] of Object.entries(rawScores)) {
    const available = value !== null;
    const normalizedWeight = available && totalAvailableWeight > 0 ? BASE_WEIGHTS[key] / totalAvailableWeight : 0;
    const contribution = available ? value * normalizedWeight : 0;
    if (available) weightedScore += contribution;

    factors.push({
      name: key,
      value: available ? value : null,
      weight: Math.round(normalizedWeight * 1000) / 1000,
      contribution: Math.round(contribution * 100) / 100,
      available,
    });
  }

  const riskScore = Math.round(Math.min(100, Math.max(0, weightedScore)));
  const riskLevel = levelForScore(riskScore);
  const confidence = Math.round((availableFactors.length / Object.keys(rawScores).length) * 100) / 100;

  return {
    riskScore,
    riskLevel,
    confidence,
    factors,
    engineVersion: 'rule-based-v1',
    isMlPrediction: false,
    rawInputs: {
      rainfallMm,
      soilMoisturePct,
      slopeDegrees,
      windSpeedKph,
      humidityPct,
      historicalEventCount: historical.count,
      verifiedFieldReportCount: fieldReportsResult.count,
    },
  };
}

module.exports = { calculateRisk, levelForScore };
