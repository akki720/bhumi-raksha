import { useEffect, useState } from 'react';
import Topbar from '../components/Topbar';
import StatCard from '../components/StatCard';
import RiskBadge from '../components/RiskBadge';
import MapView from '../components/MapView';
import { useApp } from '../context/AppContext';
import * as api from '../api/endpoints';
import { BellRing, TriangleAlert, ClipboardList, MapPinned, Users, Server } from 'lucide-react';

export default function Dashboard() {
  const { currentRisk, weather, alerts } = useApp();
  const [stats, setStats] = useState(null);
  const [riskAreas, setRiskAreas] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [dashboard, geojson] = await Promise.all([
          api.getDashboardStats(),
          api.getRiskGeoJSON(),
        ]);
        setStats(dashboard.stats);
        const features = (geojson?.features || [])
          .map((feature) => ({
            id: feature.properties?.id,
            name: feature.properties?.name,
            district: feature.properties?.district,
            state: feature.properties?.state,
            riskLevel: feature.properties?.riskLevel,
            riskScore: feature.properties?.riskScore,
            lastUpdated: feature.properties?.lastUpdated,
          }))
          .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));
        setRiskAreas(features);
      } catch (err) {
        console.error('Failed to load dashboard risk area data:', err.message);
      }
    };

    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col">
      <Topbar title="Dashboard" />
      <div className="space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Active Alerts" value={stats?.activeAlerts} icon={BellRing} accent="text-orange-400" />
          <StatCard label="High Risk Zones" value={stats?.highRiskZones} icon={TriangleAlert} accent="text-orange-400" />
          <StatCard label="Critical Zones" value={stats?.criticalRiskZones} icon={TriangleAlert} accent="text-red-400" />
          <StatCard label="Field Reports" value={stats?.fieldReportsTotal} sublabel={`${stats?.fieldReportsPending ?? 0} pending`} icon={ClipboardList} accent="text-sky-400" />
          <StatCard label="Affected Areas" value={stats?.affectedAreas} icon={MapPinned} accent="text-yellow-400" />
          <StatCard
            label="People At Risk"
            value={stats?.peopleAtRiskAvailable ? stats.peopleAtRisk : 'Unavailable'}
            sublabel={!stats?.peopleAtRiskAvailable ? 'No population data on record' : undefined}
            icon={Users}
            accent="text-purple-400"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="soft-card lg:col-span-2 p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200">Risk Heatmap</h2>
              {currentRisk && <RiskBadge level={currentRisk.riskLevel} score={currentRisk.riskScore} />}
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
              <MapView height="380px" />
            </div>
          </div>

          <div className="soft-card space-y-4 p-4 sm:p-5">
            <div>
              <h2 className="mb-2 text-sm font-semibold text-slate-200">All Risk Areas</h2>
              <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {riskAreas.length > 0 ? (
                  riskAreas.slice(0, 8).map((area) => (
                    <li key={area.id} className="rounded-xl border border-white/10 bg-slate-950/40 p-2.5 transition hover:border-sky-400/30">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-100">{area.name}</p>
                          <p className="text-[11px] text-slate-400">{area.district || 'N/A'} · {area.state || 'N/A'}</p>
                        </div>
                        <RiskBadge level={area.riskLevel} score={area.riskScore} compact />
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-slate-500">No monitored risk areas loaded yet.</li>
                )}
              </ul>
            </div>

            <div>
              <h2 className="mb-2 text-sm font-semibold text-slate-200">Current Conditions</h2>
              {weather?.available ? (
                <ul className="space-y-1 text-sm text-slate-400">
                  <li>Rainfall: <span className="text-slate-200">{weather.rainfallMm ?? '—'} mm</span></li>
                  <li>Temperature: <span className="text-slate-200">{weather.temperatureC ?? '—'} °C</span></li>
                  <li>Humidity: <span className="text-slate-200">{weather.humidityPct ?? '—'} %</span></li>
                  <li>Wind: <span className="text-slate-200">{weather.windSpeedKph?.toFixed?.(1) ?? '—'} kph</span></li>
                  <li className="pt-1 text-[11px] text-slate-500">Source: {weather.source} · {weather.observedAt ? new Date(weather.observedAt).toLocaleString() : '—'}</li>
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Live weather data currently unavailable.</p>
              )}
            </div>

            <div>
              <h2 className="mb-2 flex items-center gap-1 text-sm font-semibold text-slate-200">
                <Server size={14} /> System Status
              </h2>
              <p className="text-sm font-medium text-emerald-300">{stats?.systemStatus || 'OPERATIONAL'}</p>
              <p className="mt-1 text-xs text-slate-500">{stats?.totalMonitoredZones ?? 0} zones monitored · {stats?.historicalEventsRecorded ?? 0} historical events on record</p>
            </div>

            <div>
              <h2 className="mb-2 text-sm font-semibold text-slate-200">Recent Alerts</h2>
              <ul className="max-h-40 space-y-2 overflow-y-auto">
                {alerts.slice(0, 5).map((a) => (
                  <li key={a._id} className="border-l-2 border-orange-500/60 pl-2 text-xs text-slate-400">
                    <span className="font-medium text-slate-200">{a.riskLevel}</span> — {a.message}
                  </li>
                ))}
                {alerts.length === 0 && <li className="text-xs text-slate-500">No active alerts.</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
