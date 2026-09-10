import { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { BookOpen, Users, ClipboardList, ClipboardCheck, FileSpreadsheet, FileText, Clock } from "lucide-react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import { teacherAPI } from "../../services/api";

const STATUS_COLORS = { Graded: "#10b981", "Awaiting Grading": "#f59e0b" };

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");

  useEffect(() => {
    teacherAPI
      .getAnalytics()
      .then((res) => {
        setAnalytics(res.data || null);
        setAnalyticsLoading(false);
      })
      .catch((err) => {
        setAnalyticsError(err.response?.data?.detail || "Failed to load analytics.");
        setAnalyticsLoading(false);
      });
  }, []);

  const handleExportExcel = async () => {
    try {
      const res = await teacherAPI.exportGradesExcel();
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gradebook_report.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export Excel error', e);
    }
  };

  const handleExportPDF = async () => {
    try {
      const res = await teacherAPI.exportGradesPDF();
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gradebook_report.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export PDF error', e);
    }
  };

  // Real per-course enrollment counts from the backend -- previously this
  // read a client-side field that was hardcoded to 0 everywhere it was set
  // and never actually populated from real enrollment data.
  const engagementData = useMemo(
    () =>
      (analytics?.studentsPerCourse || []).map((c) => ({
        name: c.courseName.length > 14 ? c.courseName.slice(0, 14) + "…" : c.courseName,
        students: c.count,
      })),
    [analytics]
  );

  // Real graded-vs-awaiting-grading breakdown from actual Submission rows --
  // previously this read a fabricated "status" field that doesn't exist
  // anywhere in the Assignment model (every assignment was hardcoded to
  // "open" client-side), so the chart never reflected real grading progress.
  const statusBreakdown = useMemo(() => {
    const breakdown = analytics?.gradingBreakdown || { graded: 0, awaitingGrading: 0 };
    return [
      { name: "Graded", value: breakdown.graded },
      { name: "Awaiting Grading", value: breakdown.awaitingGrading },
    ];
  }, [analytics]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Analytics & Reports</h1>
          <p className="mt-1 text-sm text-slate-500">Real performance tracking and gradebook export.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            Export Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <FileText size={15} className="text-rose-600" />
            Export PDF
          </button>
        </div>
      </div>

      {analyticsError && (
        <p className="text-sm font-medium text-rose-600">{analyticsError}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <DashboardCard
          label="Total Courses"
          value={analyticsLoading ? "…" : analytics?.totalCourses ?? 0}
          icon={BookOpen}
          accent="indigo"
        />
        <DashboardCard
          label="Total Students"
          value={analyticsLoading ? "…" : analytics?.totalStudents ?? 0}
          icon={Users}
          accent="indigo"
        />
        <DashboardCard
          label="Total Assignments"
          value={analyticsLoading ? "…" : analytics?.totalAssignments ?? 0}
          icon={ClipboardList}
          accent="amber"
        />
        <DashboardCard
          label="Submissions Received"
          value={analyticsLoading ? "…" : analytics?.submissionsCount ?? 0}
          icon={ClipboardCheck}
          accent="emerald"
        />
        <DashboardCard
          label="Avg. Lesson Completion"
          value={analyticsLoading ? "…" : `${analytics?.averageCompletionRate ?? 0}%`}
          icon={Clock}
          accent="emerald"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Students per Course</h2>
          {engagementData.length === 0 ? (
            <p className="flex h-[280px] items-center justify-center text-sm text-slate-400">
              No courses yet -- this fills in once students are enrolled.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0", fontSize: 13 }} />
                <Bar dataKey="students" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Assignment Grading Status</h2>
          {statusBreakdown.every((s) => s.value === 0) ? (
            <p className="flex h-[280px] items-center justify-center text-sm text-slate-400">
              No submissions yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {statusBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0", fontSize: 13 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 text-center">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Weekly Score Trend</h2>
        <p className="text-sm text-slate-500">
          Weekly trend data will appear here once historical tracking is added. Every metric above reflects
          real, current data from your school.
        </p>
      </div>
    </div>
  );
}
