import { useEffect, useState, useCallback } from 'react';
import Topbar from '../components/Topbar';
import { useApp } from '../context/AppContext';
import * as api from '../api/endpoints';
import { Camera, CheckCircle2, XCircle, Clock } from 'lucide-react';

const STATUS_STYLE = {
  PENDING: 'text-yellow-400 bg-yellow-400/10',
  VERIFIED: 'text-emerald-400 bg-emerald-400/10',
  REJECTED: 'text-red-400 bg-red-400/10',
};

const OFFLINE_REPORTS_KEY = 'bhumi_offline_reports';

export default function FieldReports() {
  const { coords } = useApp();
  const [reports, setReports] = useState([]);
  const [form, setForm] = useState({ reportType: 'CRACK', description: '', severity: 'MODERATE', reporterName: '' });
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('bhumi_user') || '{}');
    } catch {
      return {};
    }
  })();
  const canVerifyReports = ['authority', 'field_officer', 'admin'].includes(currentUser.role);

  const loadReports = useCallback(() => {
    api.getFieldReports().then((d) => setReports(d.reports || [])).catch(() => {});
  }, []);

  useEffect(() => {
    loadReports();
    const interval = setInterval(loadReports, 30000);
    return () => clearInterval(interval);
  }, [loadReports]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!coords) {
      setMessage({ type: 'error', text: 'Location unavailable — cannot submit a report without GPS coordinates.' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append('latitude', coords.latitude);
      fd.append('longitude', coords.longitude);
      fd.append('reportType', form.reportType);
      fd.append('description', form.description);
      fd.append('severity', form.severity);
      fd.append('reporterName', form.reporterName || 'Anonymous');
      if (image) fd.append('image', image);

      try {
        await api.submitFieldReport(fd);
        setMessage({ type: 'success', text: 'Report submitted and pending verification.' });
      } catch (err) {
        if (!err.response && navigator.onLine === false) {
          const queued = JSON.parse(localStorage.getItem(OFFLINE_REPORTS_KEY) || '[]');
          queued.push({
            latitude: coords.latitude,
            longitude: coords.longitude,
            reportType: form.reportType,
            description: form.description,
            severity: form.severity,
            reporterName: form.reporterName || 'Anonymous',
          });
          localStorage.setItem(OFFLINE_REPORTS_KEY, JSON.stringify(queued));
          setMessage({ type: 'success', text: 'Offline: report saved and will sync when connection returns.' });
        } else {
          throw err;
        }
      }
      setForm({ reportType: 'CRACK', description: '', severity: 'MODERATE', reporterName: '' });
      setImage(null);
      loadReports();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to submit report.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportDecision = async (id, status) => {
    try {
      await api.verifyFieldReport(id, status);
      setMessage({ type: 'success', text: status === 'VERIFIED' ? 'Report verified. Users will now receive the elevated risk alert.' : 'Report rejected.' });
      loadReports();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to update report status.' });
    }
  };

  return (
    <div className="flex flex-col">
      <Topbar title="Field Reports" />
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="lg:col-span-1 rounded-xl border border-surface-border bg-surface-panel p-4 space-y-3 h-fit">
          <h2 className="font-semibold text-sm text-slate-300">Submit a Field Report</h2>
          <div className="text-xs text-slate-500">
            {coords ? `Using your location: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}` : 'Waiting for GPS location…'}
          </div>

          <label className="block text-xs text-slate-400">Report Type</label>
          <select
            className="w-full rounded-lg bg-surface border border-surface-border px-3 py-2 text-sm"
            value={form.reportType}
            onChange={(e) => setForm({ ...form, reportType: e.target.value })}
          >
            {['CRACK', 'DEBRIS', 'WATER_SEEPAGE', 'GROUND_MOVEMENT', 'SLOPE_FAILURE', 'OTHER'].map((t) => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>

          <label className="block text-xs text-slate-400">Severity</label>
          <select
            className="w-full rounded-lg bg-surface border border-surface-border px-3 py-2 text-sm"
            value={form.severity}
            onChange={(e) => setForm({ ...form, severity: e.target.value })}
          >
            {['LOW', 'MODERATE', 'HIGH', 'CRITICAL'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <label className="block text-xs text-slate-400">Description</label>
          <textarea
            className="w-full rounded-lg bg-surface border border-surface-border px-3 py-2 text-sm"
            rows={3}
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <label className="block text-xs text-slate-400">Reporter Name (optional)</label>
          <input
            className="w-full rounded-lg bg-surface border border-surface-border px-3 py-2 text-sm"
            value={form.reporterName}
            onChange={(e) => setForm({ ...form, reporterName: e.target.value })}
          />

          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <Camera size={16} /> {image ? image.name : 'Attach photo (optional)'}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setImage(e.target.files[0])} />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-sm font-semibold py-2 mt-2"
          >
            {submitting ? 'Submitting…' : 'Submit Report'}
          </button>

          {message && (
            <p className={`text-xs ${message.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>{message.text}</p>
          )}
        </form>

        <div className="lg:col-span-2 rounded-xl border border-surface-border bg-surface-panel p-4">
          <h2 className="font-semibold text-sm text-slate-300 mb-3">All Reports ({reports.length})</h2>
          <div className="space-y-2 max-h-[560px] overflow-y-auto">
            {reports.map((r) => (
              <div key={r._id} className="rounded-lg border border-surface-border p-3 flex gap-3">
                {r.imageUrl && (
                  <img src={r.imageUrl} alt="report" className="w-16 h-16 rounded object-cover flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{r.reportType.replace('_', ' ')} · {r.severity}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${STATUS_STYLE[r.status]}`}>
                      {r.status === 'VERIFIED' && <CheckCircle2 size={12} />}
                      {r.status === 'REJECTED' && <XCircle size={12} />}
                      {r.status === 'PENDING' && <Clock size={12} />}
                      {r.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{r.description}</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {r.reporterName} · {new Date(r.createdAt).toLocaleString()} · {r.latitude.toFixed(3)}, {r.longitude.toFixed(3)}
                  </p>

                  {canVerifyReports && r.status !== 'VERIFIED' && r.status !== 'REJECTED' && (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleReportDecision(r._id, 'VERIFIED')}
                        className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1.5 text-[11px] font-medium text-emerald-200"
                      >
                        Verify
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReportDecision(r._id, 'REJECTED')}
                        className="rounded-lg bg-red-500/15 border border-red-500/30 px-2.5 py-1.5 text-[11px] font-medium text-red-200"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {reports.length === 0 && <p className="text-sm text-slate-500">No field reports yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
