const STYLES = {
  active: "bg-emerald-50 text-emerald-700",
  inactive: "bg-slate-100 text-slate-600",
  pending: "bg-amber-50 text-amber-700",
  suspended: "bg-rose-50 text-rose-700",
};

export default function StatusBadge({ status }) {
  const key = status?.toLowerCase();
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
        STYLES[key] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}