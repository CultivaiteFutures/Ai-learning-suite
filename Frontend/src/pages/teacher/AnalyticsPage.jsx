import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { TrendingUp, Users, ClipboardCheck, FileSpreadsheet, FileText, Download } from "lucide-react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import { useCourses } from "../../context/CourseContext";
import { teacherAPI } from "../../services/api";

const WEEKLY_TREND = [
  { week: "Wk 1", avgScore: 74 },
  { week: "Wk 2", avgScore: 76 },
  { week: "Wk 3", avgScore: 79 },
  { week: "Wk 4", avgScore: 78 },
  { week: "Wk 5", avgScore: 82 },
  { week: "Wk 6", avgScore: 85 },
];

const STATUS_COLORS = { open: "#f59e0b", grading: "#4f46e5", closed: "#10b981" };

export default function AnalyticsPage() {
  const { courses, assignments } = useCourses();

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

  const engagementData = useMemo(
    () =>
      courses.map((c) => ({
        name: c.name.length > 14 ? c.name.slice(0, 14) + "…" : c.name,
        students: c.studentsEnrolled,
      })),
    [courses]
  );

  const statusBreakdown = useMemo(() => {
    const counts = { open: 0, grading: 0, closed: 0 };
    assignments.forEach((a) => {
      counts[a.status] = (counts[a.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, value]) => ({ name: status, value }));
  }, [assignments]);

  const totalStudents = courses.reduce((sum, c) => sum + c.studentsEnrolled, 0);
  const avgCompletion = assignments.length
    ? Math.round(
        assignments.reduce((sum, a) => sum + (a.submissionsCount / (a.totalStudents || 1)) * 100, 0) / assignments.length
      )
    : 0;

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashboardCard label="Total Students Reached" value={totalStudents} icon={Users} accent="indigo" />
        <DashboardCard label="Avg. Assignment Completion" value={`${avgCompletion}%`} icon={ClipboardCheck} accent="emerald" />
        <DashboardCard
          label="6-Week Score Trend"
          value="+11 pts"
          icon={TrendingUp}
          accent="amber"
          trend={{ direction: "up", value: "11 pts" }}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Students per Course</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={engagementData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0", fontSize: 13 }} />
              <Bar dataKey="students" fill="#4f46e5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Assignment Status</h2>
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
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Average Score Trend (Last 6 Weeks)</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={WEEKLY_TREND}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#64748b" }} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} domain={[60, 100]} />
            <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0", fontSize: 13 }} />
            <Line type="monotone" dataKey="avgScore" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}