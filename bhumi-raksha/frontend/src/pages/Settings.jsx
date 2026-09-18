import { useState } from 'react';
import Topbar from '../components/Topbar';
import { useApp } from '../context/AppContext';
import { Bell, Vibrate, RadioTower } from 'lucide-react';

export default function Settings() {
  const { geoStatus, geoError } = useApp();
  const [notifPermission, setNotifPermission] = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  );

  const requestNotifications = async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
  };

  return (
    <div className="flex flex-col">
      <Topbar title="Settings" />
      <div className="p-6 max-w-2xl space-y-4">
        <div className="rounded-xl border border-surface-border bg-surface-panel p-4">
          <h2 className="font-semibold text-sm text-slate-300 mb-3 flex items-center gap-2">
            <RadioTower size={16} /> Location Permission
          </h2>
          <p className="text-sm text-slate-400">
            Status: <span className="text-slate-200">{geoStatus}</span>
          </p>
          {geoError && <p className="text-xs text-red-400 mt-1">{geoError}</p>}
          <p className="text-xs text-slate-500 mt-2">
            BHUMI RAKSHA needs live GPS access to compute risk for your exact location and to find the nearest safe place
            during an emergency. Enable location access in your browser's site settings if it was previously denied.
          </p>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface-panel p-4">
          <h2 className="font-semibold text-sm text-slate-300 mb-3 flex items-center gap-2">
            <Bell size={16} /> Browser Notifications
          </h2>
          <p className="text-sm text-slate-400">Status: <span className="text-slate-200">{notifPermission}</span></p>
          <button
            onClick={requestNotifications}
            disabled={notifPermission === 'granted'}
            className="mt-3 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-sm font-semibold px-4 py-2"
          >
            {notifPermission === 'granted' ? 'Notifications Enabled' : 'Enable Notifications'}
          </button>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface-panel p-4">
          <h2 className="font-semibold text-sm text-slate-300 mb-3 flex items-center gap-2">
            <Vibrate size={16} /> Vibration Alerts
          </h2>
          <p className="text-sm text-slate-400">
            {'vibrate' in navigator ? 'Supported on this device — enabled automatically for HIGH/CRITICAL warnings.' : 'Not supported on this device/browser.'}
          </p>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface-panel p-4">
          <h2 className="font-semibold text-sm text-slate-300 mb-2">About</h2>
          <p className="text-xs text-slate-500">
            BHUMI RAKSHA — AI-Based Early Warning and Landslide Risk Monitoring System, built for SIH 2026. Backend:
            Node.js/Express + MongoDB. Real-time data: Open-Meteo (weather/rainfall/soil), Open-Elevation/OpenTopoData
            (terrain/slope), MongoDB geospatial queries (2dsphere). Alerts and map updates are pushed live via Socket.IO.
          </p>
        </div>
      </div>
    </div>
  );
}
