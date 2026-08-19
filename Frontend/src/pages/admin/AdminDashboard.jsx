import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users, GraduationCap, BookOpen, TrendingUp, ArrowRight } from "lucide-react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import StatusBadge from "../../components/common/StatusBadge";
import { schoolAdminAPI } from "../../services/api";

export default function AdminDashboard() {
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      schoolAdminAPI.getTeachers().catch(() => ({ data: [] })),
      schoolAdminAPI.getStudents().catch(() => ({ data: [] })),
      schoolAdminAPI.getGrades().catch(() => ({ data: [] })),
    ]).then(([resT, resS, resG]) => {
      if (resT.data && Array.isArray(resT.data)) setTeachers(resT.data);
      if (resS.data && Array.isArray(resS.data)) setStudents(resS.data);
      if (resG.data && Array.isArray(resG.data)) setGrades(resG.data);
      setLoading(false);
    });
  }, []);

  const recentTeachers = [...teachers].slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">School Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          School-wide overview of teachers, students, and grade levels.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard label="Total Teachers" value={teachers.length} icon={Users} accent="indigo" />
        <DashboardCard label="Total Students" value={students.length} icon={GraduationCap} accent="emerald" />
        <DashboardCard label="Grade Levels" value={grades.length} icon={BookOpen} accent="amber" />
        <DashboardCard label="Active Users" value={teachers.length + students.length} icon={TrendingUp} accent="rose" />
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
            {recentTeachers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No teachers onboarded yet.</div>
            ) : (
              recentTeachers.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{t.name || t.full_name}</p>
                    <p className="text-xs text-slate-500">{t.subject || "Teacher"} · {t.grade || t.grade_level || "School"}</p>
                  </div>
                  <StatusBadge status={t.status || (t.is_active ? "active" : "inactive")} />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Grade Level Snapshot</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {grades.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No grade levels created yet.</div>
            ) : (
              grades.slice(0, 6).map((g) => (
                <div key={g.id} className="flex items-center justify-between px-5 py-3">
                  <p className="text-sm text-slate-700">{g.name}</p>
                  <p className="text-sm font-medium text-slate-900">{g.students_count || g.studentsCount || 0} students</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}