import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  ClipboardList,
  BellRing,
  Settings as SettingsIcon,
  BrainCircuit,
  Activity,
  Mountain,
  Siren,
  UserCircle2,
} from 'lucide-react';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/risk-map', label: 'Risk Heatmap / GIS Map', icon: Map },
  { to: '/monitoring', label: 'Real-Time Monitoring', icon: Activity },
  { to: '/field-reports', label: 'Field Reports', icon: ClipboardList },
  { to: '/alerts', label: 'Alerts', icon: BellRing },
  { to: '/explainability', label: 'AI Explainability', icon: BrainCircuit },
  { to: '/emergency', label: 'Emergency Center', icon: Siren },
  { to: '/profile', label: 'Profile', icon: UserCircle2 },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function Sidebar() {
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('bhumi_user') || '{}');
    } catch {
      return {};
    }
  })();

  return (
    <aside className="border-b border-white/10 bg-slate-950/80 backdrop-blur-xl md:w-64 md:border-b-0 md:border-r md:border-white/10">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-4 md:px-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300 shadow-[0_0_18px_rgba(56,189,248,0.35)]">
            <Mountain size={20} />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-slate-100">BHUMI RAKSHA</p>
            <p className="text-[9px] text-slate-400 leading-tight">Early Warning · NER</p>
          </div>
        </div>
      </div>

      <nav className="flex gap-2 overflow-x-auto px-3 py-3 md:flex-col md:overflow-visible md:px-2 md:py-4">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex min-w-max items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-sky-500/20 to-cyan-500/10 text-sky-200 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.2)]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
              }`
            }
          >
            <Icon size={17} />
            <span className="whitespace-nowrap">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 px-3 py-3 md:px-4 md:pb-4">
        <div className="rounded-2xl border border-sky-400/20 bg-sky-500/5 p-3 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.08)]">
          <p className="text-[9px] uppercase tracking-[0.18em] text-slate-400">Signed in as</p>
          <p className="mt-2 text-sm font-semibold text-slate-100">{currentUser.name || 'User'}</p>
          <p className="text-[11px] font-medium text-sky-300">{(currentUser.role || 'user').toUpperCase()}</p>
        </div>
      </div>

      <div className="hidden border-t border-white/10 px-4 py-3 text-[10px] text-slate-500 md:block">
        SIH 2026 · AI-Based Early Warning System
      </div>
    </aside>
  );
}
