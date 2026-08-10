import { Inbox } from "lucide-react";

export default function EmptyState({
  title = "No data found",
  description = "There's nothing here yet.",
  icon: Icon = Inbox,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-b-xl bg-white px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon size={22} />
      </div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}