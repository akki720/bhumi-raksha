import Topbar from '../components/Topbar';
import MapView from '../components/MapView';

export default function RiskMap() {
  return (
    <div className="flex flex-col">
      <Topbar title="Risk Heatmap / GIS Map" />
      <div className="p-6 space-y-4">
        <p className="text-sm text-slate-400">
          Live risk zones across the monitored North Eastern Region, rendered from{' '}
          <code className="text-sky-400">/api/risk/geojson</code>. Colors: green (LOW), yellow (MODERATE),
          orange (HIGH), red (CRITICAL). Blue marker is your current GPS location.
        </p>
        <MapView height="calc(100vh - 220px)" />
      </div>
    </div>
  );
}
