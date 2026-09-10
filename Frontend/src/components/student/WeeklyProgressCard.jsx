import { CalendarClock } from "lucide-react";

export default function WeeklyProgressCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Weekly Progress</h2>
      </div>
      <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
        <CalendarClock className="text-slate-300" size={28} />
        <p className="text-sm font-medium text-slate-500">Daily study tracking isn't available yet</p>
        <p className="max-w-xs text-xs text-slate-400">
          Check back once day-by-day study time is tracked for your account.
        </p>
      </div>
    </div>
  );
}
