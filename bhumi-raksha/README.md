# BHUMI RAKSHA
AI-Based Early Warning and Landslide Risk Monitoring System in NER — SIH 2026

This is the **full-stack backend + real-time data integration** built to plug into your existing React frontend.

## What's included

```
bhumi-raksha/
├── backend/          Node.js + Express + MongoDB API, risk engine, Socket.IO
└── frontend/          A working React (Vite) reference app that already wires
                       every screen to the live backend, so you can see the
                       full flow end-to-end and copy the api/hooks/context
                       layer into your existing frontend project.
```

> Your existing UI was not available in this conversation (no files were
> uploaded), so the `frontend/` here is a complete, functioning reference
> implementation with the same screens your prompt described (Dashboard,
> Risk Heatmap/GIS Map, Real-Time Monitoring, Field Reports, Alerts,
> AI Explainability, Settings) — all already connected to real data. If you
> send me your actual project, I will port `src/api`, `src/hooks`,
> `src/context/AppContext.jsx`, and the socket wiring into it and remove any
> mock data, without touching your existing UI/design.

## Real data sources used (no fake/random data anywhere)

| Data | Provider | Notes |
|---|---|---|
| Rainfall, temperature, humidity, pressure, wind, forecast | **Open-Meteo** (no API key) | Swap to OpenWeatherMap by setting `WEATHER_PROVIDER=openweathermap` + `OWM_API_KEY` |
| Elevation & slope | **Open-Elevation**, fallback **OpenTopoData (SRTM 90m)** | Slope is derived from real 4-point elevation sampling, not invented |
| Soil moisture | **Open-Meteo soil layer model** | Soil *type* has no free live API — reported as `unavailable` until a source (e.g. SoilGrids) is wired in |
| Satellite / NDVI / SMAP / IMERG | Architecture in `services/satelliteService.js` | Requires Copernicus/NASA credentials — returns `available: false` until configured, never fakes a "live" satellite feed |
| Historical landslides | Your imported dataset via `/api/risk/import-historical` | Never invented; import GSI Bhukosh/NDMA/state records |
| Field reports | Citizen/officer submissions | Stored in MongoDB, verified reports feed into the risk engine |

Every external-data response carries `source`, `sourceUrl` (where applicable), `observedAt`/`retrievedAt`, and — critically — an explicit `available: false` when a live call fails and no valid cache exists. Nothing is silently replaced with a placeholder number.

## Quick start

### 1. Backend

```bash
cd backend
cp .env.example .env      # edit MONGO_URI, JWT_SECRET etc.
npm install
npm run seed               # inserts starter NER risk zones + safe places
npm run dev                 # starts on http://localhost:5000
```

Requires a running MongoDB instance (local `mongod`, or a MongoDB Atlas URI in `MONGO_URI`).

### 2. Frontend (reference app)

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                 # starts on http://localhost:5173
```

Open the app, allow location access, and the dashboard, map, monitoring, and alerts all populate from the live backend.

## API surface

```
GET  /api/health
POST /api/auth/register | /api/auth/login          GET /api/auth/me

GET  /api/weather/current?lat=&lon=
GET  /api/weather/forecast?lat=&lon=

GET  /api/risk/nearby?lat=&lon=
GET  /api/risk/geojson
GET  /api/risk/historical?lat=&lon=&radiusKm=
POST /api/risk/import-historical   (admin/field_officer)

POST /api/reports          (multipart, field "image" optional)
GET  /api/reports
GET  /api/reports/:id
PATCH /api/reports/:id/verify   (admin/field_officer)

GET  /api/alerts
GET  /api/alerts/nearby?lat=&lon=&radiusKm=
PATCH /api/alerts/:id/acknowledge
PATCH /api/alerts/:id/resolve   (admin/field_officer)

GET  /api/safe-places/nearby?lat=&lon=&radiusKm=
GET  /api/safe-places
POST /api/safe-places   (admin)

GET  /api/dashboard/stats
```

Socket.IO events broadcast from the server: `risk:update`, `alert:new`, `weather:update`, `report:new`.

## Risk engine

`backend/services/riskEngine.js` is a transparent, weighted rule-based engine
(`engineVersion: "rule-based-v1"`) combining rainfall, slope, soil moisture,
historical landslide frequency (from MongoDB geospatial query), weather
conditions, and verified field reports. Any input that's unavailable is
excluded from the score (weight redistributed, not defaulted to a fake
value), and the resulting `confidence` field tells you how many of the six
inputs were actually live.

To swap in a trained Python ML model later: implement a module with the
same return shape (`{ riskScore, riskLevel, confidence, factors[],
engineVersion, isMlPrediction, rawInputs }`) — e.g. by calling out to a
Python FastAPI/Flask microservice — and swap the `require('./riskEngine')`
call in `riskController.js` and `riskZoneRefresher.js`. No route, model, or
frontend code needs to change.

## MongoDB collections

`users`, `weatherData`, `riskZones`, `historicalLandslides`, `predictions`,
`fieldReports`, `alerts`, `safePlaces` — all with timestamps and, where
geographic, a `2dsphere` index for real geospatial queries (`$near`).

## Failure handling

If a live external API fails, the backend serves the latest cached record
(with a `stale: true` flag) if one exists within the configured TTL;
otherwise every endpoint returns `{ "available": false, "message": "Live
data currently unavailable" }`. Nothing generates synthetic sensor, weather,
or GPS data to fill the gap.
