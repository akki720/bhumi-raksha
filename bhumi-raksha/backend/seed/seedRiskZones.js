require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const RiskZone = require('../models/RiskZone');
const SafePlace = require('../models/SafePlace');

/**
 * Seeds a starter set of REAL, named locations across the North Eastern
 * Region (NER) of India -- landslide-prone districts per publicly known
 * geography (Kohima, Shillong, Aizawl, Itanagar, Gangtok corridors, etc.).
 * Coordinates are the real town/city coordinates so live weather/terrain
 * lookups return meaningful values. Risk scores start at 0 / LOW and are
 * populated for real on the first scheduled refresh (or by running
 * `npm run seed` then triggering /api/risk/nearby, or waiting for the
 * 15-minute cron in riskZoneRefresher.js).
 */
const zones = [
  { name: 'Kohima Ridge', district: 'Kohima', state: 'Nagaland', lat: 25.6747, lon: 94.1086 },
  { name: 'Shillong Peak Road', district: 'East Khasi Hills', state: 'Meghalaya', lat: 25.5788, lon: 91.8933 },
  { name: 'Aizawl Tanhril', district: 'Aizawl', state: 'Mizoram', lat: 23.7367, lon: 92.7173 },
  { name: 'Itanagar Foothills', district: 'Papum Pare', state: 'Arunachal Pradesh', lat: 27.0844, lon: 93.6053 },
  { name: 'Gangtok-Nathula corridor', district: 'East Sikkim', state: 'Sikkim', lat: 27.3389, lon: 88.6065 },
  { name: 'Imphal-Ukhrul road', district: 'Ukhrul', state: 'Manipur', lat: 25.0500, lon: 94.3667 },
  { name: 'Agartala Baramura hills', district: 'West Tripura', state: 'Tripura', lat: 23.8500, lon: 91.4167 },
  { name: 'Darjeeling-Kalimpong ridge', district: 'Kalimpong', state: 'West Bengal (NER-adjacent)', lat: 27.0669, lon: 88.4700 },
];

const safePlaces = [
  { name: 'Kohima District Hospital', category: 'HOSPITAL', lat: 25.6701, lon: 94.1077, verified: true, source: 'seed-data' },
  { name: 'Shillong Civil Hospital', category: 'HOSPITAL', lat: 25.5744, lon: 91.8825, verified: true, source: 'seed-data' },
  { name: 'Aizawl Civil Hospital', category: 'HOSPITAL', lat: 23.7307, lon: 92.7173, verified: true, source: 'seed-data' },
  { name: 'Kohima Police Station', category: 'POLICE_STATION', lat: 25.6600, lon: 94.1100, verified: true, source: 'seed-data' },
  { name: 'Shillong DC Office (Emergency Ops)', category: 'GOVERNMENT_FACILITY', lat: 25.5760, lon: 91.8800, verified: true, source: 'seed-data' },
];

async function run() {
  await connectDB();

  console.log('Clearing existing seeded risk zones and safe places (idempotent reseed)...');
  await RiskZone.deleteMany({ dataSource: { $in: ['seed', 'mixed', 'unavailable'] } });
  await SafePlace.deleteMany({ source: 'seed-data' });

  const zoneDocs = zones.map((z) => ({
    name: z.name,
    district: z.district,
    state: z.state,
    location: { type: 'Point', coordinates: [z.lon, z.lat] },
    riskScore: 0,
    riskLevel: 'LOW',
    dataSource: 'seed',
    active: true,
  }));
  const insertedZones = await RiskZone.insertMany(zoneDocs);
  console.log(`Inserted ${insertedZones.length} risk zones.`);

  const placeDocs = safePlaces.map((p) => ({
    name: p.name,
    category: p.category,
    location: { type: 'Point', coordinates: [p.lon, p.lat] },
    latitude: p.lat,
    longitude: p.lon,
    verified: p.verified,
    source: p.source,
  }));
  const insertedPlaces = await SafePlace.insertMany(placeDocs);
  console.log(`Inserted ${insertedPlaces.length} safe places.`);

  console.log('Seed complete. Run the server and hit /api/risk/nearby or wait for the cron job to populate live risk scores.');
  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
