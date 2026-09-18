import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, CircleMarker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import * as api from '../api/endpoints';
import { useApp } from '../context/AppContext';

const LEVEL_COLOR = { LOW: '#22c55e', MODERATE: '#eab308', HIGH: '#f97316', CRITICAL: '#ef4444' };
const RISK_LEVEL_ORDER = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];

const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const groupNearbyPoints = (items) => {
  const grouped = [];
  const map = new Map();

  items.forEach((item) => {
    const key = `${Math.round(item.position[0] * 1000) / 1000},${Math.round(item.position[1] * 1000) / 1000}`;
    if (!map.has(key)) {
      map.set(key, { ...item, count: 1 });
    } else {
      const current = map.get(key);
      current.count += 1;
      current.labels = [...(current.labels || [current.label]), item.label];
    }
  });

  map.forEach((item) => grouped.push(item));
  return grouped;
};

const makeClusterIcon = (count, color) =>
  L.divIcon({
    className: 'leaflet-custom-cluster',
    html: `<div style="background:${color};width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid rgba(255,255,255,0.8);box-shadow:0 0 20px rgba(148,163,184,0.35);color:white;">${count}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

function Recenter({ coords, geojson }) {
  const map = useMap();
  useEffect(() => {
    if (!geojson || !geojson.features || geojson.features.length === 0) {
      if (coords) map.setView([coords.latitude, coords.longitude], map.getZoom());
      return;
    }

    const bounds = L.latLngBounds(
      geojson.features
        .filter((f) => f.geometry?.type === 'Point' && Array.isArray(f.geometry.coordinates))
        .map((f) => [f.geometry.coordinates[1], f.geometry.coordinates[0]])
    );

    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.35), { maxZoom: 8 });
    } else if (coords) {
      map.setView([coords.latitude, coords.longitude], map.getZoom());
    }
  }, [coords, geojson, map]);
  return null;
}

export default function MapView({ height = '520px' }) {
  const { coords, safeRoute } = useApp();
  const mapRef = useRef(null);
  const [geojson, setGeojson] = useState(null);
  const [safePlaces, setSafePlaces] = useState([]);
  const [historicalEvents, setHistoricalEvents] = useState([]);
  const [fieldReports, setFieldReports] = useState([]);
  const [showRiskZones, setShowRiskZones] = useState(true);
  const [showHistorical, setShowHistorical] = useState(true);
  const [showSafePlaces, setShowSafePlaces] = useState(true);
  const [showUserLocation, setShowUserLocation] = useState(true);
  const [showFieldReports, setShowFieldReports] = useState(true);
  const [tileMode, setTileMode] = useState('streets');
  const [selectedRiskFilters, setSelectedRiskFilters] = useState({
    LOW: true,
    MODERATE: true,
    HIGH: true,
    CRITICAL: true,
  });
  const [nearestSafePlace, setNearestSafePlace] = useState(null);

  const loadRiskZones = useCallback(async () => {
    try {
      const data = await api.getRiskGeoJSON();
      setGeojson(data);
    } catch (err) {
      console.error('Failed to load risk GeoJSON:', err.message);
    }
  }, []);

  useEffect(() => {
    loadRiskZones();
    const interval = setInterval(loadRiskZones, 60000);
    return () => clearInterval(interval);
  }, [loadRiskZones]);

  useEffect(() => {
    api
      .getFieldReports()
      .then((data) => setFieldReports((data.reports || []).filter((report) => report.status !== 'REJECTED')))
      .catch((err) => console.error('Failed to load field reports:', err.message));
  }, []);

  useEffect(() => {
    if (!coords) return;
    api
      .getNearbySafePlaces(coords.latitude, coords.longitude, 25)
      .then((data) => {
        const list = data.safePlaces || [];
        setSafePlaces(list);
        if (list.length) {
          const nearest = list.reduce((best, current) => {
            const currentDist = getDistanceKm(coords.latitude, coords.longitude, current.latitude, current.longitude);
            const bestDist = best ? getDistanceKm(coords.latitude, coords.longitude, best.latitude, best.longitude) : Number.POSITIVE_INFINITY;
            return currentDist < bestDist ? current : best;
          }, null);
          setNearestSafePlace(nearest);
        } else {
          setNearestSafePlace(null);
        }
      })
      .catch((err) => console.error('Failed to load safe places:', err.message));

    api
      .getHistoricalLandslides(coords.latitude, coords.longitude, 80)
      .then((data) => setHistoricalEvents(data.events || []))
      .catch((err) => console.error('Failed to load historical landslides:', err.message));
  }, [coords]);

  const riskGeojson = useMemo(() => {
    if (!geojson) return null;
    const filteredFeatures = (geojson.features || []).filter((feature) => {
      const riskLevel = feature?.properties?.riskLevel;
      return !!riskLevel && selectedRiskFilters[riskLevel];
    });

    return { ...geojson, features: filteredFeatures };
  }, [geojson, selectedRiskFilters]);

  const toggleRiskFilter = (riskLevel) => {
    setSelectedRiskFilters((prev) => ({ ...prev, [riskLevel]: !prev[riskLevel] }));
  };

  const center = coords ? [coords.latitude, coords.longitude] : [25.6, 92.9];

  const fitToVisibleData = useCallback(() => {
    if (!mapRef.current) return;

    const points = [];

    if (coords) {
      points.push([coords.latitude, coords.longitude]);
    }

    if (riskGeojson?.features?.length) {
      riskGeojson.features
        .filter((feature) => feature.geometry?.type === 'Point' && Array.isArray(feature.geometry.coordinates))
        .forEach((feature) => {
          points.push([feature.geometry.coordinates[1], feature.geometry.coordinates[0]]);
        });
    }

    if (safePlaces.length) {
      safePlaces.forEach((place) => points.push([place.latitude, place.longitude]));
    }

    if (historicalEvents.length) {
      historicalEvents.forEach((event) => points.push([event.latitude, event.longitude]));
    }

    if (fieldReports.length) {
      fieldReports.forEach((report) => points.push([report.latitude, report.longitude]));
    }

    if (!points.length) return;

    const bounds = L.latLngBounds(points);
    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds.pad(0.2), { maxZoom: 9 });
    }
  }, [coords, riskGeojson, safePlaces, historicalEvents, fieldReports]);

  const focusOnUser = useCallback(() => {
    if (!coords || !mapRef.current) return;
    mapRef.current.flyTo([coords.latitude, coords.longitude], 10, { duration: 1.2 });
  }, [coords]);

  const focusNearestSafePlace = useCallback(() => {
    if (!nearestSafePlace || !mapRef.current) return;
    mapRef.current.flyTo([nearestSafePlace.latitude, nearestSafePlace.longitude], 12, { duration: 1.2 });
  }, [nearestSafePlace]);

  const style = (feature) => {
    const score = Number(feature.properties?.riskScore ?? 0);
    const riskLevel = feature.properties?.riskLevel || 'LOW';
    const fillOpacity = 0.18 + Math.min(score / 100, 0.7);

    return {
      radius: 10,
      fillColor: LEVEL_COLOR[riskLevel] || '#64748b',
      color: LEVEL_COLOR[riskLevel] || '#64748b',
      weight: 2,
      fillOpacity,
      opacity: 0.8,
      stroke: true,
    };
  };

  const pointToLayer = (feature, latlng) => L.circleMarker(latlng, style(feature));

  const onEachFeature = (feature, layer) => {
    const p = feature.properties;
    layer.bindPopup(
      `<div style="font-size:12px;line-height:1.4">
        <b>${p.name}</b><br/>
        Risk: <b>${p.riskLevel}</b> (${p.riskScore})<br/>
        Rainfall: ${p.rainfallMm ?? '—'} mm<br/>
        Slope: ${p.slopeDegrees ?? '—'}°<br/>
        Elevation: ${p.elevationM ?? '—'} m<br/>
        Source: ${p.dataSource ?? '—'}<br/>
        Updated: ${p.lastUpdated ? new Date(p.lastUpdated).toLocaleString() : '—'}
      </div>`
    );
  };

  const routeDistance = safeRoute?.distanceKm ? Number(safeRoute.distanceKm).toFixed(1) : null;
  const routeMinutes = safeRoute?.estimatedMinutes ? Math.round(safeRoute.estimatedMinutes) : null;

  const layerButtons = [
    { label: 'Risk zones', active: showRiskZones, onClick: () => setShowRiskZones((v) => !v) },
    { label: 'History', active: showHistorical, onClick: () => setShowHistorical((v) => !v) },
    { label: 'Safe places', active: showSafePlaces, onClick: () => setShowSafePlaces((v) => !v) },
    { label: 'Reports', active: showFieldReports, onClick: () => setShowFieldReports((v) => !v) },
    { label: 'My location', active: showUserLocation, onClick: () => setShowUserLocation((v) => !v) },
  ];

  const tileUrl = tileMode === 'satellite'
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const reportClusters = useMemo(
    () =>
      groupNearbyPoints(
        fieldReports.map((report) => ({
          position: [report.latitude, report.longitude],
          label: report.reportType,
          data: report,
          color: report.severity === 'CRITICAL' ? '#f43f5e' : report.severity === 'HIGH' ? '#f97316' : report.severity === 'MODERATE' ? '#facc15' : '#38bdf8',
        }))
      ),
    [fieldReports]
  );

  const historyClusters = useMemo(
    () =>
      groupNearbyPoints(
        historicalEvents.map((event) => ({
          position: [event.latitude, event.longitude],
          label: event.locationName,
          data: event,
          color: '#f43f5e',
        }))
      ),
    [historicalEvents]
  );

  return (
    <div style={{ height }} className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl shadow-sky-950/20">
      <div className="absolute left-3 top-3 z-[500] flex flex-wrap gap-2 rounded-lg border border-slate-700 bg-slate-950/85 p-2 shadow-lg backdrop-blur-sm">
        {layerButtons.map((button) => (
          <button
            key={button.label}
            type="button"
            onClick={button.onClick}
            className={`rounded-md border px-2 py-1 text-[11px] font-medium transition ${
              button.active
                ? 'border-sky-500 bg-sky-500/20 text-sky-200'
                : 'border-slate-600 bg-slate-800 text-slate-300'
            }`}
          >
            {button.label}
          </button>
        ))}
      </div>

      <div className="absolute left-3 top-20 z-[500] flex flex-wrap gap-2 rounded-lg border border-slate-700 bg-slate-950/85 p-1.5 shadow-lg backdrop-blur-sm">
        <button
          type="button"
          onClick={focusOnUser}
          className="rounded-md border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-[11px] font-medium text-sky-200 transition hover:bg-sky-500/20"
        >
          Center me
        </button>
        <button
          type="button"
          onClick={fitToVisibleData}
          className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-200 transition hover:bg-slate-700"
        >
          Fit view
        </button>
        <button
          type="button"
          onClick={() => setTileMode((prev) => (prev === 'streets' ? 'satellite' : 'streets'))}
          className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-200 transition hover:bg-slate-700"
        >
          {tileMode === 'streets' ? 'Satellite' : 'Street'}
        </button>
        <button
          type="button"
          onClick={focusNearestSafePlace}
          className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-200 transition hover:bg-emerald-500/20"
        >
          Nearest shelter
        </button>
      </div>

      <div className="absolute right-3 top-3 z-[500] rounded-lg border border-slate-700 bg-slate-950/85 p-2 text-[11px] text-slate-200 shadow-lg backdrop-blur-sm">
        <div className="mb-1 font-semibold text-slate-100">Legend</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Low</div>
          <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-yellow-400" /> Moderate</div>
          <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> High</div>
          <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Critical</div>
          <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-pink-500" /> Historical</div>
        </div>
      </div>

      <div className="absolute right-3 top-40 z-[500] rounded-lg border border-slate-700 bg-slate-950/85 p-2 text-[11px] text-slate-200 shadow-lg backdrop-blur-sm">
        <div className="mb-2 font-semibold text-slate-100">Risk filter</div>
        <div className="flex flex-col gap-1.5">
          {RISK_LEVEL_ORDER.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => toggleRiskFilter(level)}
              className={`flex items-center justify-between gap-3 rounded-md border px-2 py-1 text-[10px] transition ${
                selectedRiskFilters[level]
                  ? 'border-slate-500 bg-slate-800 text-slate-100'
                  : 'border-slate-700 bg-slate-900/40 text-slate-500'
              }`}
            >
              <span>{level}</span>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: LEVEL_COLOR[level] }} />
            </button>
          ))}
        </div>
      </div>

      <div className="absolute bottom-3 left-3 z-[500] rounded-lg border border-slate-700 bg-slate-950/85 px-3 py-2 text-[11px] text-slate-200 shadow-lg backdrop-blur-sm">
        <div>{riskGeojson?.features?.length ?? 0} risk zones</div>
        <div>{historicalEvents.length} historical events</div>
        <div>{safePlaces.length} safe places</div>
        <div>{fieldReports.length} field reports</div>
      </div>

      {nearestSafePlace && coords && (
        <div className="absolute bottom-3 right-3 z-[500] rounded-lg border border-emerald-500/30 bg-slate-950/85 px-3 py-2 text-[11px] text-slate-100 shadow-lg backdrop-blur-sm">
          <div className="font-semibold text-emerald-200">Nearest shelter</div>
          <div>{nearestSafePlace.name}</div>
          <div>{getDistanceKm(coords.latitude, coords.longitude, nearestSafePlace.latitude, nearestSafePlace.longitude).toFixed(1)} km away</div>
        </div>
      )}

      {safeRoute && (
        <div className="absolute bottom-28 right-3 z-[500] rounded-lg border border-sky-500/30 bg-slate-950/85 px-3 py-2 text-[11px] text-slate-100 shadow-lg backdrop-blur-sm">
          <div className="font-semibold text-sky-200">Safer route</div>
          <div>{safeRoute.targetName || 'Target zone'} · {routeDistance ?? '—'} km</div>
          <div>{routeMinutes ? `${routeMinutes} min estimated` : 'Route estimated'} </div>
        </div>
      )}

      <MapContainer ref={mapRef} center={center} zoom={8} style={{ height: '100%', width: '100%' }} zoomControl={true}>
        <TileLayer
          attribution={tileMode === 'satellite' ? '&copy; Esri, OpenStreetMap contributors' : '&copy; OpenStreetMap contributors'}
          url={tileUrl}
        />
        {showRiskZones && riskGeojson && (
          <GeoJSON key={JSON.stringify(riskGeojson).length} data={riskGeojson} pointToLayer={pointToLayer} onEachFeature={onEachFeature} />
        )}
        {showUserLocation && coords && (
          <CircleMarker
            center={[coords.latitude, coords.longitude]}
            radius={8}
            pathOptions={{ color: '#38bdf8', fillColor: '#38bdf8', fillOpacity: 0.9 }}
          >
            <Popup>Your current location</Popup>
          </CircleMarker>
        )}
        {nearestSafePlace && coords && showSafePlaces && (
          <Polyline
            positions={[[coords.latitude, coords.longitude], [nearestSafePlace.latitude, nearestSafePlace.longitude]]}
            pathOptions={{ color: '#34d399', weight: 4, opacity: 0.85, dashArray: '10 8' }}
          >
            <Popup>Nearest safe shelter route</Popup>
          </Polyline>
        )}
        {showHistorical && historyClusters.map((cluster) => {
          if (cluster.count <= 1) {
            const event = cluster.data;
            return (
              <CircleMarker
                key={`${event._id || event.locationName}-${event.date}`}
                center={[event.latitude, event.longitude]}
                radius={7}
                pathOptions={{ color: '#f43f5e', fillColor: '#f43f5e', fillOpacity: 0.8, weight: 1 }}
              >
                <Popup>
                  <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                    <b>{event.locationName}</b><br />
                    Severity: <b>{event.severity}</b><br />
                    Date: {new Date(event.date).toLocaleDateString()}<br />
                    Trigger: {event.trigger || '—'}<br />
                    Source: {event.source}<br />
                    Fatalities: {event.fatalities ?? '—'}
                  </div>
                </Popup>
              </CircleMarker>
            );
          }

          return (
            <Marker
              key={`history-cluster-${cluster.position[0]}-${cluster.position[1]}`}
              position={cluster.position}
              icon={makeClusterIcon(cluster.count, '#f43f5e')}
            >
              <Popup>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                  <b>{cluster.count}</b> historical events nearby
                </div>
              </Popup>
            </Marker>
          );
        })}
        {showFieldReports && reportClusters.map((cluster) => {
          if (cluster.count <= 1) {
            const report = cluster.data;
            return (
              <CircleMarker
                key={report._id}
                center={[report.latitude, report.longitude]}
                radius={8}
                pathOptions={{
                  color: report.severity === 'CRITICAL' ? '#f43f5e' : report.severity === 'HIGH' ? '#f97316' : report.severity === 'MODERATE' ? '#facc15' : '#38bdf8',
                  fillColor: report.severity === 'CRITICAL' ? '#f43f5e' : report.severity === 'HIGH' ? '#f97316' : report.severity === 'MODERATE' ? '#facc15' : '#38bdf8',
                  fillOpacity: 0.9,
                  weight: 1,
                }}
              >
                <Popup>
                  <div style={{ fontSize: 12, lineHeight: 1.5, maxWidth: 220 }}>
                    <b>{report.reportType.replace('_', ' ')}</b><br />
                    Severity: <b>{report.severity}</b><br />
                    Status: <b>{report.status}</b><br />
                    Reported by: {report.reporterName || 'Anonymous'}<br />
                    {report.description}<br />
                    Location: {report.latitude?.toFixed(4)}, {report.longitude?.toFixed(4)}
                  </div>
                </Popup>
              </CircleMarker>
            );
          }

          return (
            <Marker
              key={`report-cluster-${cluster.position[0]}-${cluster.position[1]}`}
              position={cluster.position}
              icon={makeClusterIcon(cluster.count, cluster.color)}
            >
              <Popup>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                  <b>{cluster.count}</b> reports in this location cluster
                </div>
              </Popup>
            </Marker>
          );
        })}
        {safeRoute?.path?.length > 1 && (
          <Polyline
            positions={safeRoute.path}
            pathOptions={{ color: '#38bdf8', weight: 5, opacity: 0.9, dashArray: '10 8' }}
          >
            <Popup>Safer route to {safeRoute.targetName}</Popup>
          </Polyline>
        )}
        {showSafePlaces && safePlaces.map((p) => (
          <Marker key={p._id} position={[p.latitude, p.longitude]}>
            <Popup>
              <b>{p.name}</b>
              <br />
              {p.category.replace('_', ' ')}
              <br />
              {p.distanceKm} km away
            </Popup>
          </Marker>
        ))}
        <Recenter coords={coords} geojson={riskGeojson} />
      </MapContainer>
    </div>
  );
}
