import Topbar from '../components/Topbar';
import RiskBadge from '../components/RiskBadge';
import { useApp } from '../context/AppContext';
import { BrainCircuit, Info } from 'lucide-react';

const FACTOR_LABEL = {
  rainfall: 'Rainfall',
  soilMoisture: 'Soil Moisture',
  slope: 'Slope',
  historicalFrequency: 'Historical Landslide Frequency',
  weatherCondition: 'Weather Conditions',
  fieldReports: 'Verified Field Reports',
};

export default function AIExplainability() {
  const { currentRisk } = useApp();

  return (
    <div className="flex flex-col">
      <Topbar title="AI Explainability" />
      <div className="p-6 space-y-6">
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4 flex gap-3 text-sm text-slate-300">
          <Info size={18} className="text-sky-400 flex-shrink-0 mt-0.5" />
          <p>
            This is a transparent, rule-based scoring engine (<code className="text-sky-400">engineVersion: rule-based-v1</code>),
            not a trained neural network. It is architected so a Python ML model can be swapped in later without changing
            this screen — every factor below is a real weighted contribution to the score, and any input that was unavailable
            is excluded rather than guessed.
          </p>
        </div>

        {!currentRisk ? (
          <p className="text-sm text-slate-500">Waiting for the first risk computation for your location…</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-surface-border bg-surface-panel p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2 text-sm text-slate-300">
                  <BrainCircuit size={18} /> Current Assessment
                </h2>
                <RiskBadge level={currentRisk.riskLevel} score={currentRisk.riskScore} />
              </div>
              <ul className="text-sm space-y-2 text-slate-400">
                <li>Confidence: <span className="text-slate-200">{Math.round((currentRisk.confidence ?? 0) * 100)}%</span> (based on {currentRisk.factors?.filter(f => f.available).length ?? 0}/{currentRisk.factors?.length ?? 0} data sources available)</li>
                <li>Engine: <span className="text-slate-200">rule-based-v1</span></li>
                <li>ML Model Used: <span className="text-slate-200">{currentRisk.isMlPrediction ? 'Yes' : 'No — architecture ready, not yet connected'}</span></li>
                <li>Computed At: <span className="text-slate-200">{currentRisk.computedAt ? new Date(currentRisk.computedAt).toLocaleString() : '—'}</span></li>
              </ul>
            </div>

            <div className="rounded-xl border border-surface-border bg-surface-panel p-5">
              <h2 className="font-semibold text-sm text-slate-300 mb-4">Factor Contributions</h2>
              <div className="space-y-3">
                {currentRisk.factors?.map((f) => (
                  <div key={f.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">{FACTOR_LABEL[f.name] || f.name}</span>
                      <span className={f.available ? 'text-slate-400' : 'text-slate-600 italic'}>
                        {f.available ? `contributes ${f.contribution}` : 'unavailable'}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full ${f.available ? 'bg-sky-500' : 'bg-slate-700'}`}
                        style={{ width: `${Math.min(100, (f.value ?? 0))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
