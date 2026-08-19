import { Trophy } from "lucide-react";
import { useStudentProgress } from "../../context/StudentProgressContext";

export default function LeaderboardCard() {
  const { xp } = useStudentProgress();

  const entries = [
    { rank: 1, initials: "YOU", name: "You (Student)", xp: xp || 0, isCurrentUser: true }
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-amber-500" />
          <h2 className="text-sm font-semibold text-slate-900">Leaderboard</h2>
        </div>
        <span className="text-xs font-medium text-indigo-600">You're #1</span>
      </div>

      <div className="divide-y divide-slate-100">
        {entries.map((entry) => (
          <div
            key={entry.rank}
            className={`flex items-center justify-between px-5 py-3 ${entry.isCurrentUser ? "bg-indigo-50/60" : ""}`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                {entry.rank}
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-semibold text-white">
                {entry.initials}
              </div>
              <span className="text-sm font-semibold text-indigo-700">
                {entry.name}
              </span>
            </div>
            <span className="text-xs font-medium text-slate-500">{entry.xp.toLocaleString()} XP</span>
          </div>
        ))}
      </div>
    </div>
  );
}