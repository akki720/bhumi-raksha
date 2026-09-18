import { useApp } from '../context/AppContext';
import { AlertTriangle, X } from 'lucide-react';

export default function WarningToast() {
  const { toast, dismissToast } = useApp();
  if (!toast) return null;

  const critical = toast.riskLevel === 'CRITICAL';
  const safePlace = toast.safePlace;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div
        className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl shadow-red-950/50 ${
          critical ? 'border-red-500/40 bg-red-500/10' : 'border-amber-500/40 bg-amber-500/10'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`rounded-full p-2 ${critical ? 'bg-red-500/20' : 'bg-amber-500/20'}`}>
            <AlertTriangle className={critical ? 'text-red-300' : 'text-amber-300'} size={28} />
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Emergency Warning</p>
            <h3 className="mt-2 text-2xl font-black text-white">{toast.riskLevel || 'HIGH'} Risk Zone</h3>
            <p className="mt-2 text-sm text-slate-200">{toast.message}</p>

            {typeof toast.distanceKm === 'number' && (
              <p className="mt-3 text-sm text-red-100">
                You are approximately {toast.distanceKm.toFixed(1)} km from the danger zone.
              </p>
            )}

            {safePlace && (
              <div className="mt-4 rounded-xl border border-sky-500/20 bg-sky-500/10 p-3 text-sm text-sky-100">
                <p className="font-semibold text-sky-200">Nearest safe location</p>
                <p className="mt-1">{safePlace.name}</p>
                {typeof safePlace.distanceKm === 'number' && (
                  <p className="mt-1 text-xs text-sky-200/80">{safePlace.distanceKm.toFixed(1)} km away</p>
                )}
              </div>
            )}
          </div>
          <button onClick={dismissToast} className="text-slate-300 hover:text-white">
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
