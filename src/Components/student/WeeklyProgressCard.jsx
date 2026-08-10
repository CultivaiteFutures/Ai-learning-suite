import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const WEEKLY_STUDY_DATA = [
  { day: "Mon", minutes: 25 },
  { day: "Tue", minutes: 40 },
  { day: "Wed", minutes: 15 },
  { day: "Thu", minutes: 35 },
  { day: "Fri", minutes: 20 },
  { day: "Sat", minutes: 45 },
  { day: "Sun", minutes: 15 },
];

export default function WeeklyProgressCard() {
  const totalMinutes = WEEKLY_STUDY_DATA.reduce((sum, d) => sum + d.minutes, 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Weekly Progress</h2>
        <span className="text-xs text-slate-400">{totalMinutes} min this week</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={WEEKLY_STUDY_DATA} margin={{ top: 16, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0", fontSize: 12 }} cursor={{ fill: "#f8fafc" }} />
          <Bar dataKey="minutes" fill="#4f46e5" radius={[5, 5, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}