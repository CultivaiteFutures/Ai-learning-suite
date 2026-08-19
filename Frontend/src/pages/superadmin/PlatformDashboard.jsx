import { Link } from "react-router-dom";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { Building2, CheckCircle2, XCircle, Users, GraduationCap, BookOpen, Activity, Sparkles, ArrowRight } from "lucide-react";
import PlatformStatCard from "../../components/superadmin/PlatformStatCard";
import SchoolStatusBadge from "../../components/superadmin/SchoolStatusBadge";
import { useSchools } from "../../context/SchoolContext";

const PLAN_COLORS = { Trial: "#94a3b8", Basic: "#3b82f6", Premium: "#8b5cf6", Enterprise: "#f59e0b" };

export default function PlatformDashboard() {
  const { schools, activityLogs, platformStats } = useSchools();

  const recentSchools = [...schools].sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate)).slice(0, 5);
  const recentActivity = [...activityLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Platform Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Platform-wide overview across every school on AI Learning Suite.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PlatformStatCard label="Total Schools" value={platformStats.totalSchools} icon={Building2} accent="indigo" />
        <PlatformStatCard label="Active Schools" value={platformStats.activeSchools} icon={CheckCircle2} accent="emerald" />
        <PlatformStatCard label="Inactive Schools" value={platformStats.inactiveSchools} icon={XCircle} accent="rose" />
        <PlatformStatCard label="Total Teachers" value={platformStats.totalTeachers} icon={Users} accent="amber" />
        <PlatformStatCard label="Total Students" value={platformStats.totalStudents} icon={GraduationCap} accent="indigo" />
        <PlatformStatCard label="Total Courses" value={platformStats.totalCourses} icon={BookOpen} accent="emerald" />
        <PlatformStatCard label="Monthly Active Users" value={platformStats.monthlyActiveUsers} icon={Activity} accent="amber" />
        <PlatformStatCard label="AI Usage (calls)" value={platformStats.aiUsageCount.toLocaleString()} icon={Sparkles} accent="rose" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Recent Schools</h2>
            <Link to="/super-admin/schools" className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentSchools.map((s) => (
              <Link key={s.id} to={`/super-admin/schools/${s.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-800">{s.schoolName}</p>
                  <p className="text-xs text-slate-500">{s.city}, {s.state} · {s.subscriptionPlan}</p>
                </div>
                <SchoolStatusBadge status={s.status} />
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Subscription Distribution</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={platformStats.subscriptionDistribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {platformStats.subscriptionDistribution.map((entry) => (
                  <Cell key={entry.name} fill={PLAN_COLORS[entry.name] || "#94a3b8"} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0", fontSize: 12 }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Recent Activity</h2>
          <Link to="/super-admin/activity" className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
            View all <ArrowRight size={13} />
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {recentActivity.map((a) => (
            <div key={a.id} className="px-5 py-3">
              <p className="text-sm text-slate-700">{a.message}</p>
              <p className="mt-0.5 text-xs text-slate-400">{new Date(a.timestamp).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}