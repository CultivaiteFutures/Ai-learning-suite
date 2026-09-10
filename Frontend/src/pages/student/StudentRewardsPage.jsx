import { useState, useEffect } from "react";
import { Trophy, Flame, Award, Star, CheckCircle2, Zap, Shield } from "lucide-react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import { studentAPI } from "../../services/api";

export default function StudentRewardsPage() {
  const [stats, setStats] = useState({ xp: 0, streak_days: 0, badges: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentAPI.getStats().then((res) => {
      if (res.data) setStats(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const allBadges = [
    { title: "First Lesson", desc: "Completed your first interactive lesson", icon: Star, color: "text-amber-500 bg-amber-50" },
    { title: "3-Day Streak", desc: "Maintained active study for 3 consecutive days", icon: Flame, color: "text-rose-500 bg-rose-50" },
    { title: "Assignment Champion", desc: "Submitted work on time with excellence", icon: Award, color: "text-indigo-500 bg-indigo-50" },
    { title: "Quiz Master", desc: "Achieved 100% score on a module quiz", icon: Zap, color: "text-emerald-500 bg-emerald-50" },
    { title: "Curriculum Pioneer", desc: "Explored 5+ advanced course topics", icon: Shield, color: "text-purple-500 bg-purple-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Rewards & Achievements</h1>
        <p className="mt-1 text-sm text-slate-500">Track your learning points, continuous streaks, and earned badges.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashboardCard label="Experience Points (XP)" value={`${stats.xp || 0} XP`} icon={Trophy} accent="indigo" />
        <DashboardCard label="Current Streak" value={`${stats.streak_days || 0} Days`} icon={Flame} accent="rose" />
        <DashboardCard label="Badges Unlocked" value={(stats.badges || []).length} icon={Award} accent="emerald" />
      </div>

      {/* Badges Grid */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-slate-900">Achievement Badges</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allBadges.map((b) => {
            const Icon = b.icon;
            const isUnlocked = (stats.badges || []).includes(b.title);
            return (
              <div
                key={b.title}
                className={`flex items-start gap-4 rounded-xl border p-4 transition ${
                  isUnlocked ? "border-slate-200 bg-white shadow-sm" : "border-slate-100 bg-slate-50 opacity-60"
                }`}
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${b.color}`}>
                  <Icon size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-slate-900">{b.title}</p>
                    {isUnlocked && <CheckCircle2 size={14} className="text-emerald-500" />}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{b.desc}</p>
                  <span className="mt-2 inline-block rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {isUnlocked ? "Unlocked" : "In Progress"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
