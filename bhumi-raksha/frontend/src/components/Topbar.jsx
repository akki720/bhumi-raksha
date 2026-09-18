import { useApp } from '../context/AppContext';
import RiskBadge from './RiskBadge';
import { MapPin, Wifi, WifiOff } from 'lucide-react';

export default function Topbar({ title }) {
  const { coords, geoStatus, currentRisk } = useApp();

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/75 px-4 py-3 backdrop-blur-xl sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-sky-300/80">Bhumi Raksha</p>
          <h1 className="mt-1 text-lg font-semibold text-slate-100 sm:text-xl">{title}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1.5 text-[11px] text-slate-300 sm:text-xs">
            <MapPin size={14} className="text-sky-300" />
            {coords ? (
              <span>
                {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
              </span>
            ) : (
              <span>{geoStatus === 'requesting' ? 'Locating…' : 'Location unavailable'}</span>
            )}
          </div>

          {currentRisk && <RiskBadge level={currentRisk.riskLevel} score={currentRisk.riskScore} />}

          <div className="flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-300 sm:text-xs">
            {coords ? <Wifi size={12} className="text-emerald-300" /> : <WifiOff size={12} className="text-slate-400" />}
            Live
          </div>
        </div>
      </div>
    </header>
  );
}
