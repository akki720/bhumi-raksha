const LEVEL_STYLES = {
  LOW: 'bg-risk-low/15 text-risk-low border-risk-low/40',
  MODERATE: 'bg-risk-moderate/15 text-risk-moderate border-risk-moderate/40',
  HIGH: 'bg-risk-high/15 text-risk-high border-risk-high/40',
  CRITICAL: 'bg-risk-critical/15 text-risk-critical border-risk-critical/40 animate-pulse',
};

export default function RiskBadge({ level = 'LOW', score, compact = false }) {
  const cls = LEVEL_STYLES[level] || LEVEL_STYLES.LOW;
  const displayScore = typeof score === 'number' ? ` · ${score}` : '';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'} font-semibold tracking-wide ${cls}`}>
      {level}
      {!compact && <span className="opacity-70">{displayScore}</span>}
      {compact && typeof score === 'number' && <span className="opacity-70">{score}</span>}
    </span>
  );
}
