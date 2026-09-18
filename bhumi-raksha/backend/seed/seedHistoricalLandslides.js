require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const connectDB = require('../config/db');
const HistoricalLandslide = require('../models/HistoricalLandslide');

const events = [
  {
    locationName: 'Kohima Ridge',
    latitude: 25.6747,
    longitude: 94.1086,
    date: '2022-06-12T00:00:00.000Z',
    type: 'debris flow',
    severity: 'SEVERE',
    trigger: 'heavy rainfall',
    fatalities: 3,
    source: 'seed-sample',
    sourceUrl: 'https://example.com/sample-history',
    notes: 'Sample historical landslide inserted for testing map visibility.',
  },
  {
    locationName: 'Shillong Peak Road',
    latitude: 25.5788,
    longitude: 91.8933,
    date: '2021-08-18T00:00:00.000Z',
    type: 'rockfall',
    severity: 'MODERATE',
    trigger: 'continuous rainfall',
    fatalities: 1,
    source: 'seed-sample',
    sourceUrl: 'https://example.com/sample-history',
    notes: 'Sample historical landslide inserted for testing map visibility.',
  },
  {
    locationName: 'Aizawl Tanhril',
    latitude: 23.7367,
    longitude: 92.7173,
    date: '2020-07-04T00:00:00.000Z',
    type: 'slump',
    severity: 'SEVERE',
    trigger: 'slope saturation',
    fatalities: 2,
    source: 'seed-sample',
    sourceUrl: 'https://example.com/sample-history',
    notes: 'Sample historical landslide inserted for testing map visibility.',
  },
  {
    locationName: 'Itanagar Foothills',
    latitude: 27.0844,
    longitude: 93.6053,
    date: '2019-05-21T00:00:00.000Z',
    type: 'mudslide',
    severity: 'MODERATE',
    trigger: 'heavy downpour',
    fatalities: 0,
    source: 'seed-sample',
    sourceUrl: 'https://example.com/sample-history',
    notes: 'Sample historical landslide inserted for testing map visibility.',
  },
  {
    locationName: 'Gangtok Nathula Road',
    latitude: 27.3389,
    longitude: 88.6065,
    date: '2023-09-07T00:00:00.000Z',
    type: 'debris flow',
    severity: 'SEVERE',
    trigger: 'cloudburst',
    fatalities: 4,
    source: 'seed-sample',
    sourceUrl: 'https://example.com/sample-history',
    notes: 'Sample historical landslide inserted for testing map visibility.',
  },
];

async function run() {
  await connectDB();

  await HistoricalLandslide.deleteMany({ source: 'seed-sample' });

  const docs = events.map((event) => ({
    location: {
      type: 'Point',
      coordinates: [event.longitude, event.latitude],
    },
    latitude: event.latitude,
    longitude: event.longitude,
    date: new Date(event.date),
    locationName: event.locationName,
    type: event.type,
    severity: event.severity,
    trigger: event.trigger,
    fatalities: event.fatalities,
    source: event.source,
    sourceUrl: event.sourceUrl,
    notes: event.notes,
  }));

  const inserted = await HistoricalLandslide.insertMany(docs);
  console.log(`Inserted ${inserted.length} historical landslide records.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Historical seed failed:', err);
  process.exit(1);
});
