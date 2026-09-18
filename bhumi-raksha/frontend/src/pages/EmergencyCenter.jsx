import { useEffect, useState } from 'react';
import Topbar from '../components/Topbar';
import { useApp } from '../context/AppContext';
import * as api from '../api/endpoints';
import {
  AlertTriangle,
  ShieldCheck,
  MapPinned,
  PhoneCall,
  Compass,
  CheckCircle2,
  Siren,
  ShieldAlert,
  Map,
  Users,
  RefreshCcw,
  ClipboardCheck,
  BadgeCheck,
  Clock3,
} from 'lucide-react';

export default function EmergencyCenter() {
  const { coords, safeRoute, setSafeRoute, alerts } = useApp();
  const [sos, setSos] = useState(null);
  const [status, setStatus] = useState('READY');
  const [pendingAuthorities, setPendingAuthorities] = useState([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('bhumi_user') || '{}');
    } catch {
      return {};
    }
  })();
  const isAuthority = currentUser.role === 'authority' || currentUser.role === 'admin';
  const isAdmin = currentUser.role === 'admin';
  const urgentAlerts = alerts.filter((alert) => ['HIGH', 'CRITICAL'].includes(alert.riskLevel)).slice(0, 3);

  const loadPendingAuthorities = async () => {
    if (!isAdmin) return;

    try {
      const response = await api.getPendingAuthorities();
      setPendingAuthorities(response.pendingAuthorities || []);
    } catch (err) {
      console.error('Failed to load pending authorities:', err.message);
    }
  };

  const handleApproveAuthority = async (id, approved) => {
    try {
      setLoadingApprovals(true);
      await api.updateAuthorityApproval(id, approved, approved ? 'Approved by admin dashboard' : 'Rejected by admin dashboard');
      await loadPendingAuthorities();
    } catch (err) {
      console.error('Failed to update authority approval:', err.message);
    } finally {
      setLoadingApprovals(false);
    }
  };

  useEffect(() => {
    if (!coords) return;
    const runEmergency = async () => {
      try {
        const [sosRes, routeRes] = await Promise.all([
          api.sendSOS({ latitude: coords.latitude, longitude: coords.longitude, source: 'web' }),
          api.getSafeRoute(coords.latitude, coords.longitude),
        ]);
        setSos(sosRes.sos);
        setSafeRoute(routeRes.route);
        setStatus(sosRes.sos?.riskLevel || 'READY');
      } catch (err) {
        console.error('Emergency center failed:', err.message);
      }
    };

    runEmergency();
  }, [coords, setSafeRoute]);

  useEffect(() => {
    loadPendingAuthorities();
  }, [isAdmin]);

  return (
    <div className="flex flex-col">
      <Topbar title="Emergency Center" />
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-surface-border bg-surface-panel p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-slate-300">Emergency SOS</h2>
            <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-300">
              {status}
            </span>
          </div>

          {sos ? (
            <div className="space-y-3 text-sm text-slate-300">
              <p className="flex items-center gap-2 text-red-300"><AlertTriangle size={16} /> {sos.message}</p>
              <p className="flex items-center gap-2"><MapPinned size={16} /> GPS: {sos.latitude?.toFixed(4)}, {sos.longitude?.toFixed(4)}</p>
              <p className="flex items-center gap-2"><ShieldCheck size={16} /> Nearest safe zone: {sos.nearestSafeZoneName || 'Not available'}</p>
              <p className="flex items-center gap-2"><PhoneCall size={16} /> Emergency contacts: {sos.emergencyContacts?.join(', ')}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Waiting for GPS and risk context…</p>
          )}
        </div>

        <div className="rounded-xl border border-surface-border bg-surface-panel p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
            <Compass size={16} /> Safer Route
          </div>

          {safeRoute ? (
            <div className="space-y-2 text-sm text-slate-300">
              <p>Route to: <span className="text-sky-300">{safeRoute.targetName}</span></p>
              <p>Distance: <span className="text-slate-100">{safeRoute.distanceKm} km</span></p>
              <p>Estimated travel time: <span className="text-slate-100">{safeRoute.estimatedMinutes} min</span></p>
              <p>Risk along route: <span className="text-amber-300">{safeRoute.riskAlongRoute}</span></p>
              <p className="flex items-center gap-2"><CheckCircle2 size={16} /> Avoided high-risk zones: {safeRoute.avoidedZones?.length || 0}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Safe route estimate unavailable.</p>
          )}
        </div>

        {isAuthority && (
          <div className="lg:col-span-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
                <Siren size={16} /> Authority Response Console
              </div>
              <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase text-amber-200">
                {currentUser.role === 'admin' ? 'Admin Mode' : 'Authority Mode'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
              <div className="rounded-lg border border-surface-border bg-surface-panel p-3">
                <div className="flex items-center gap-2 text-slate-400"><ShieldAlert size={15} /> Active alerts</div>
                <p className="mt-2 text-2xl font-bold text-red-300">{urgentAlerts.length}</p>
              </div>
              <div className="rounded-lg border border-surface-border bg-surface-panel p-3">
                <div className="flex items-center gap-2 text-slate-400"><Map size={15} /> Safe zones</div>
                <p className="mt-2 text-2xl font-bold text-sky-300">{sos?.nearestSafeZoneName ? 1 : 0}</p>
              </div>
              <div className="rounded-lg border border-surface-border bg-surface-panel p-3">
                <div className="flex items-center gap-2 text-slate-400"><Users size={15} /> Dispatch ready</div>
                <p className="mt-2 text-2xl font-bold text-emerald-300">{currentUser.role === 'admin' ? '3 Teams' : '2 Teams'}</p>
              </div>
              <div className="rounded-lg border border-surface-border bg-surface-panel p-3">
                <div className="flex items-center gap-2 text-slate-400"><Clock3 size={15} /> Pending review</div>
                <p className="mt-2 text-2xl font-bold text-violet-300">{pendingAuthorities.length}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-300">
              <div className="rounded-lg border border-surface-border bg-surface-panel p-3">
                <h3 className="font-medium text-slate-200 flex items-center gap-2"><ClipboardCheck size={15} /> Priority actions</h3>
                <ul className="mt-3 space-y-2 text-slate-300">
                  <li>• Dispatch field inspection teams to high-risk zones</li>
                  <li>• Issue public warning advisory through local channels</li>
                  <li>• Open evacuation route guidance for affected communities</li>
                  {isAdmin && <li>• Review pending authority approvals before dispatch activation</li>}
                </ul>
              </div>

              <div className="rounded-lg border border-surface-border bg-surface-panel p-3">
                <h3 className="font-medium text-slate-200 flex items-center gap-2"><RefreshCcw size={15} /> Latest hotspots</h3>
                <ul className="mt-3 space-y-2 text-slate-300">
                  {urgentAlerts.length ? urgentAlerts.map((alert) => (
                    <li key={alert._id} className="flex justify-between gap-3">
                      <span>{alert.riskLevel}</span>
                      <span className="text-slate-400">{alert.latitude?.toFixed(3)}, {alert.longitude?.toFixed(3)}</span>
                    </li>
                  )) : <li>No urgent alerts right now.</li>}
                </ul>
              </div>
            </div>

            {isAdmin && (
              <div className="rounded-lg border border-surface-border bg-surface-panel p-3">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <BadgeCheck size={15} /> Authority approvals
                </div>

                {pendingAuthorities.length === 0 ? (
                  <p className="text-sm text-slate-500">No authority accounts are awaiting approval.</p>
                ) : (
                  <div className="space-y-3">
                    {pendingAuthorities.map((user) => (
                      <div key={user.id} className="flex flex-col gap-3 rounded-lg border border-slate-700 bg-slate-900/50 p-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-medium text-slate-100">{user.name}</p>
                          <p className="text-xs text-slate-400">{user.email} · {user.department || 'Department not provided'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleApproveAuthority(user.id, true)}
                            disabled={loadingApprovals}
                            className="rounded-md bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/30 disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApproveAuthority(user.id, false)}
                            disabled={loadingApprovals}
                            className="rounded-md bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/25 disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
