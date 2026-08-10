export default function ProgressCard({ title, icon: Icon, accent = "indigo", percent, valueLabel, variant = "bar", footer }) {
  const accents = {
    indigo: { text: "text-indigo-600", bg: "bg-indigo-50", ring: "#4f46e5", bar: "bg-indigo-600" },
    emerald: { text: "text-emerald-600", bg: "bg-emerald-50", ring: "#10b981", bar: "bg-emerald-600" },
    amber: { text: "text-amber-600", bg: "bg-amber-50", ring: "#f59e0b", bar: "bg-amber-500" },
    rose: { text: "text-rose-600", bg: "bg-rose-50", ring: "#f43f5e", bar: "bg-rose-500" },
  };
  const a = accents[accent];

  const clampedPercent = Math.min(100, Math.max(0, percent));
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clampedPercent / 100);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        {Icon && (
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${a.bg} ${a.text}`}>
            <Icon size={16} strokeWidth={2} />
          </div>
        )}
        <p className="text-sm font-medium text-slate-600">{title}</p>
      </div>

      {variant === "ring" ? (
        <div className="mt-4 flex items-center gap-4">
          <svg width="72" height="72" viewBox="0 0 100 100" className="-rotate-90 shrink-0">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={a.ring}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-500"
            />
          </svg>
          <div>
            <p className="text-lg font-semibold text-slate-900">{valueLabel}</p>
            {footer && <p className="mt-0.5 text-xs text-slate-400">{footer}</p>}
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-lg font-semibold text-slate-900">{valueLabel}</p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${a.bar} transition-all duration-500`} style={{ width: `${clampedPercent}%` }} />
          </div>
          {footer && <p className="mt-1.5 text-xs text-slate-400">{footer}</p>}
        </div>
      )}
    </div>
  );
}