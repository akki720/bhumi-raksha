import { useEffect, useState, useCallback } from 'react';
import Topbar from '../components/Topbar';
import RiskBadge from '../components/RiskBadge';
import * as api from '../api/endpoints';
import { BellRing, CheckCheck } from 'lucide-react';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);

  const load = useCallback(() => {
    api.getAlerts().then((d) => setAlerts(d.alerts || [])).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [load]);

  const handleAck = async (id) => {
    await api.acknowledgeAlert(id);
    load();
  };

  return (
    <div className="flex flex-col">
      <Topbar title="Alerts" />
      <div className="p-6">
        <div className="rounded-xl border border-surface-border bg-surface-panel p-4">
          <h2 className="font-semibold text-sm text-slate-300 mb-3 flex items-center gap-2">
            <BellRing size={16} /> Active Alerts ({alerts.length})
          </h2>
          <div className="space-y-2">
            {alerts.map((a) => (
              <div key={a._id} className="rounded-lg border border-surface-border p-3 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <RiskBadge level={a.riskLevel} score={a.riskScore} />
                    <span className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm mt-1">{a.message}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}</p>
                </div>
                {!a.acknowledged ? (
                  <button
                    onClick={() => handleAck(a._id)}
                    className="text-xs flex items-center gap-1 rounded-lg border border-surface-border px-3 py-1.5 hover:bg-white/5"
                  >
                    <CheckCheck size={14} /> Acknowledge
                  </button>
                ) : (
                  <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCheck size={14} /> Acknowledged</span>
                )}
              </div>
            ))}
            {alerts.length === 0 && <p className="text-sm text-slate-500">No active alerts right now.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
