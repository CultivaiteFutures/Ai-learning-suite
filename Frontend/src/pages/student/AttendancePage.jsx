import { useState, useEffect } from "react";
import { CalendarCheck } from "lucide-react";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import { studentAPI } from "../../services/api";

const STATUS_STYLES = {
  present: "bg-emerald-50 text-emerald-700",
  late: "bg-amber-50 text-amber-700",
  excused: "bg-sky-50 text-sky-700",
  absent: "bg-rose-50 text-rose-700",
};

export default function AttendancePage() {
  const [data, setData] = useState({ records: [], summary: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    studentAPI
      .getAttendance()
      .then((res) => setData(res.data || { records: [], summary: [] }))
      .catch(() => setError("Could not load your attendance. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Attendance</h1>
        <p className="mt-1 text-sm text-slate-500">Your attendance record across all your courses.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {loading ? (
        <LoadingState rows={4} columns={2} />
      ) : (
        <>
          {data.summary.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.summary.map((s) => (
                <div key={s.course_id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">{s.course_name}</p>
                  <p className="mt-2 text-2xl font-bold text-indigo-600">{s.attendance_rate}%</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {s.present_count} present · {s.late_count} late · {s.excused_count} excused · {s.absent_count} absent
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Recent records</h2>
            </div>
            {data.records.length === 0 ? (
              <EmptyState title="No attendance recorded yet" description="Your teacher hasn't taken attendance yet." icon={CalendarCheck} />
            ) : (
              <div className="divide-y divide-slate-100">
                {data.records.map((r) => (
                  <div key={r.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{r.course_name}</p>
                      <p className="text-xs text-slate-400">{new Date(r.date).toLocaleDateString()}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[r.status] || "bg-slate-100 text-slate-600"}`}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
