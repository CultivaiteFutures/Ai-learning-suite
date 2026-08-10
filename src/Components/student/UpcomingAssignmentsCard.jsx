import { ClipboardList } from "lucide-react";

function daysUntil(dateStr) {
  const diff = Math.round((new Date(dateStr) - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "Overdue";
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  return `Due in ${diff} days`;
}

export default function UpcomingAssignmentsCard({ assignments }) {
  const sorted = [...(assignments || [])].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <ClipboardList size={16} className="text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-900">Upcoming Assignments</h2>
      </div>
      <div className="divide-y divide-slate-100">
        {sorted.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-400">You're all caught up — no assignments due.</p>
        ) : (
          sorted.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{a.title}</p>
                <p className="text-xs text-slate-500">{a.courseName}</p>
              </div>
              <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">{daysUntil(a.dueDate)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}