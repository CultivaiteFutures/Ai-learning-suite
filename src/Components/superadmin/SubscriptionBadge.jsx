const STYLES = {
  Trial: "bg-slate-100 text-slate-600",
  Basic: "bg-blue-50 text-blue-700",
  Premium: "bg-violet-50 text-violet-700",
  Enterprise: "bg-amber-50 text-amber-700",
};

export default function SubscriptionBadge({ plan }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STYLES[plan] || "bg-slate-100 text-slate-600"}`}>
      {plan}
    </span>
  );
}