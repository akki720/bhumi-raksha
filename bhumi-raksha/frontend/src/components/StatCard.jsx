export default function StatCard({ label, value, sublabel, icon: Icon, accent = 'text-sky-400' }) {
  return (
    <div className="soft-card group flex items-start justify-between p-4 sm:p-5">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{label}</p>
        <p className={`mt-2 text-2xl font-bold sm:text-[1.8rem] ${accent}`}>{value ?? '—'}</p>
        {sublabel && <p className="mt-1 text-xs text-slate-400">{sublabel}</p>}
      </div>

      {Icon && (
        <div className={`animate-glow flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-slate-900/80 ${accent}`}>
          <Icon size={20} />
        </div>
      )}
    </div>
  );
}
