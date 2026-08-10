import { Link } from "react-router-dom";
import { Users, GraduationCap, BookOpen, TrendingUp, ArrowRight } from "lucide-react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import StatusBadge from "../../components/common/StatusBadge";
import mockTeachers from "../../data/mockTeachers.json";
import mockStudents from "../../data/mockStudents.json";
import mockGrades from "../../data/mockGrades.json";

export default function AdminDashboard() {
  const recentTeachers = [...mockTeachers]
    .sort((a, b) => new Date(b.joinedDate) - new Date(a.joinedDate))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">School Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          School-wide overview of teachers, students, and grade levels.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard label="Total Teachers" value={mockTeachers.length} icon={Users} accent="indigo" trend={{ direction: "up", value: "4.2%" }} />
        <DashboardCard label="Total Students" value={mockStudents.length} icon={GraduationCap} accent="emerald" trend={{ direction: "up", value: "2.8%" }} />
        <DashboardCard label="Grade Levels" value={mockGrades.length} icon={BookOpen} accent="amber" />
        <DashboardCard label="Avg. Performance" value="82%" icon={TrendingUp} accent="rose" trend={{ direction: "up", value: "1.1%" }} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Recently Added Teachers</h2>
            <Link to="/admin/teachers" className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentTeachers.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.subject} · {t.gradeLevel}</p>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Grade Level Snapshot</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {mockGrades.slice(0, 6).map((g) => (
              <div key={g.id} className="flex items-center justify-between px-5 py-3">
                <p className="text-sm text-slate-700">{g.name}</p>
                <p className="text-sm font-medium text-slate-900">{g.studentsCount} students</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}