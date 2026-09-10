import { useState, useEffect, useCallback } from "react";
import { CalendarCheck } from "lucide-react";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import { parentAPI } from "../../services/api";

const STATUS_STYLES = {
  present: "bg-emerald-50 text-emerald-700",
  late: "bg-amber-50 text-amber-700",
  excused: "bg-sky-50 text-sky-700",
  absent: "bg-rose-50 text-rose-700",
};

export default function AttendancePage() {
  const [children, setChildren] = useState([]);
  const [childId, setChildId] = useState("");
  const [data, setData] = useState({ records: [], summary: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    parentAPI
      .getChildren()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setChildren(list);
        if (list.length > 0) setChildId(list[0].id);
        else setLoading(false);
      })
      .catch(() => {
        setError("Could not load your linked children.");
        setLoading(false);
      });
  }, []);

  const loadAttendance = useCallback(() => {
    if (!childId) return;
    setLoading(true);
    parentAPI
      .getChildAttendance(childId)
      .then((res) => setData(res.data || { records: [], summary: [] }))
      .catch(() => setError("Could not load this child's attendance."))
      .finally(() => setLoading(false));
  }, [childId]);

  useEffect(() => {
    if (childId) loadAttendance();
  }, [childId, loadAttendance]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Attendance</h1>
        <p className="mt-1 text-sm text-slate-500">Your children's attendance records.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {children.length > 1 && (
        <select
          value={childId}
          onChange={(e) => setChildId(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
        >
          {children.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}

      {loading ? (
        <LoadingState rows={4} columns={2} />
      ) : children.length === 0 ? (
        <EmptyState title="No linked children yet" description="Your school hasn't linked any student accounts to your profile yet." icon={CalendarCheck} />
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
              <EmptyState title="No attendance recorded yet" description="This child's teachers haven't taken attendance yet." icon={CalendarCheck} />
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
