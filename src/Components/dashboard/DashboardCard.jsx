export default function DashboardCard({ label, value, icon: Icon, trend, accent = "indigo" }) {
  const accents = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
        </div>
        {Icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accents[accent]}`}>
            <Icon size={19} strokeWidth={2} />
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs font-medium">
          <span className={trend.direction === "up" ? "text-emerald-600" : "text-rose-600"}>
            {trend.direction === "up" ? "↑" : "↓"} {trend.value}
          </span>
          <span className="text-slate-400">vs last month</span>
        </div>
      )}
    </div>
  );
}