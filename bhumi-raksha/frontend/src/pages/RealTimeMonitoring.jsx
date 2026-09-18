import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Topbar from '../components/Topbar';
import RiskBadge from '../components/RiskBadge';
import { useApp } from '../context/AppContext';
import * as api from '../api/endpoints';

export default function RealTimeMonitoring() {
  const { coords, currentRisk, weather } = useApp();
  const [forecast, setForecast] = useState(null);
  const [log, setLog] = useState([]);

  useEffect(() => {
    if (!coords) return;
    api
      .getForecast(coords.latitude, coords.longitude)
      .then((data) => setForecast(data))
      .catch(() => {});
  }, [coords]);

  useEffect(() => {
    if (currentRisk) {
      setLog((prev) => [
        { time: new Date().toLocaleTimeString(), riskScore: currentRisk.riskScore, riskLevel: currentRisk.riskLevel },
        ...prev,
      ].slice(0, 20));
    }
  }, [currentRisk?.riskScore]);

  const chartData =
    forecast?.available && forecast.forecast?.hourly
      ? forecast.forecast.hourly.time.slice(0, 24).map((t, i) => ({
          time: new Date(t).getHours() + ':00',
          rainfall: forecast.forecast.hourly.precipitation?.[i] ?? 0,
        }))
      : [];

  return (
    <div className="flex flex-col">
      <Topbar title="Real-Time Monitoring" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-surface-border bg-surface-panel p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm text-slate-300">24-Hour Rainfall Forecast</h2>
              <span className="text-xs text-slate-500">Source: Open-Meteo</span>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2b45" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} unit="mm" />
                  <Tooltip contentStyle={{ background: '#111a2e', border: '1px solid #1f2b45' }} />
                  <Line type="monotone" dataKey="rainfall" stroke="#38bdf8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-500 py-16 text-center">Forecast data currently unavailable.</p>
            )}
          </div>

          <div className="rounded-xl border border-surface-border bg-surface-panel p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm text-slate-300">Live Risk Score Log</h2>
              {currentRisk && <RiskBadge level={currentRisk.riskLevel} score={currentRisk.riskScore} />}
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {log.map((entry, i) => (
                <div key={i} className="flex items-center justify-between text-xs text-slate-400 border-b border-surface-border py-1.5">
                  <span>{entry.time}</span>
                  <RiskBadge level={entry.riskLevel} score={entry.riskScore} />
                </div>
              ))}
              {log.length === 0 && <p className="text-sm text-slate-500">Waiting for first risk computation…</p>}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface-panel p-4">
          <h2 className="font-semibold text-sm text-slate-300 mb-3">Live Data Sources</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <SourceStatus label="Weather / Rainfall" available={weather?.available} source={weather?.source} />
            <SourceStatus label="Elevation / Slope" available={currentRisk?.dataAvailability?.terrain} source="Open-Elevation" />
            <SourceStatus label="Soil Moisture" available={currentRisk?.dataAvailability?.soilMoisture} source="Open-Meteo soil layer" />
            <SourceStatus label="Historical + Field Reports" available={true} source="MongoDB" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SourceStatus({ label, available, source }) {
  return (
    <div className="rounded-lg border border-surface-border p-3">
      <p className="text-slate-400 text-xs">{label}</p>
      <p className={`font-semibold mt-1 ${available ? 'text-emerald-400' : 'text-slate-500'}`}>
        {available ? 'LIVE' : 'UNAVAILABLE'}
      </p>
      <p className="text-[11px] text-slate-500 mt-0.5">{source || '—'}</p>
    </div>
  );
}
