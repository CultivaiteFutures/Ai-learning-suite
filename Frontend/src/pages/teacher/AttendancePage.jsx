import { useState, useEffect, useCallback } from "react";
import { CalendarCheck, Save, BarChart3 } from "lucide-react";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import { teacherAPI } from "../../services/api";

const STATUSES = [
  { value: "present", label: "Present", activeClasses: "bg-emerald-600 text-white border-emerald-600" },
  { value: "late", label: "Late", activeClasses: "bg-amber-500 text-white border-amber-500" },
  { value: "excused", label: "Excused", activeClasses: "bg-sky-500 text-white border-sky-500" },
  { value: "absent", label: "Absent", activeClasses: "bg-rose-600 text-white border-rose-600" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function AttendancePage() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [roster, setRoster] = useState([]);
  const [summary, setSummary] = useState([]);
  const [view, setView] = useState("take"); // "take" | "summary"
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    teacherAPI
      .getCourses()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setCourses(list);
        if (list.length > 0) setCourseId(list[0].id);
      })
      .catch(() => setError("Could not load your courses."))
      .finally(() => setLoading(false));
  }, []);

  const loadRoster = useCallback(() => {
    if (!courseId) return;
    setLoading(true);
    teacherAPI
      .getCourseAttendance(courseId, date)
      .then((res) => setRoster(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError("Could not load this course's roster."))
      .finally(() => setLoading(false));
  }, [courseId, date]);

  const loadSummary = useCallback(() => {
    if (!courseId) return;
    setLoading(true);
    teacherAPI
      .getCourseAttendanceSummary(courseId)
      .then((res) => setSummary(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError("Could not load the attendance summary."))
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    setError("");
    if (view === "take") loadRoster();
    else loadSummary();
  }, [courseId, date, view, loadRoster, loadSummary]);

  const setStatus = (studentId, status) => {
    setRoster((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, status } : r)));
  };

  const handleSave = () => {
    setSaving(true);
    setSavedMessage("");
    setError("");
    const records = roster.filter((r) => r.status).map((r) => ({ studentId: r.studentId, status: r.status }));
    teacherAPI
      .markAttendance({ courseId, date, records })
      .then(() => setSavedMessage("Attendance saved."))
      .catch(() => setError("Could not save attendance. Please try again."))
      .finally(() => setSaving(false));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Attendance</h1>
          <p className="mt-1 text-sm text-slate-500">Take daily attendance for your courses.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView("take")}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${view === "take" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            Take attendance
          </button>
          <button
            type="button"
            onClick={() => setView("summary")}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium ${view === "summary" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            <BarChart3 size={14} /> Summary
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}
      {savedMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{savedMessage}</div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        {view === "take" && (
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <LoadingState rows={5} columns={2} />
        ) : courses.length === 0 ? (
          <EmptyState title="No courses yet" description="Create a course to start taking attendance." icon={CalendarCheck} />
        ) : view === "take" ? (
          roster.length === 0 ? (
            <EmptyState title="No students enrolled" description="Once students join this course, they'll appear here." icon={CalendarCheck} />
          ) : (
            <>
              <div className="divide-y divide-slate-100">
                {roster.map((r) => (
                  <div key={r.studentId} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium text-slate-800">{r.studentName}</p>
                    <div className="flex flex-wrap gap-2">
                      {STATUSES.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setStatus(r.studentId, s.value)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${r.status === s.value ? s.activeClasses : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end border-t border-slate-100 px-5 py-4">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Save size={14} />
                  {saving ? "Saving..." : "Save attendance"}
                </button>
              </div>
            </>
          )
        ) : summary.length === 0 ? (
          <EmptyState title="No attendance recorded yet" description="Take attendance at least once to see a summary here." icon={BarChart3} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3">Present</th>
                  <th className="px-5 py-3">Late</th>
                  <th className="px-5 py-3">Excused</th>
                  <th className="px-5 py-3">Absent</th>
                  <th className="px-5 py-3">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.map((s) => (
                  <tr key={s.studentId}>
                    <td className="px-5 py-3 font-medium text-slate-800">{s.studentName}</td>
                    <td className="px-5 py-3 text-slate-600">{s.presentCount}</td>
                    <td className="px-5 py-3 text-slate-600">{s.lateCount}</td>
                    <td className="px-5 py-3 text-slate-600">{s.excusedCount}</td>
                    <td className="px-5 py-3 text-slate-600">{s.absentCount}</td>
                    <td className="px-5 py-3 font-semibold text-slate-800">{s.attendanceRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
