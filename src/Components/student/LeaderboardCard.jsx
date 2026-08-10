import { Trophy } from "lucide-react";
import mockLeaderboard from "../../data/mockLeaderboard.json";

export default function LeaderboardCard() {
  const currentUser = mockLeaderboard.find((entry) => entry.isCurrentUser);

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-amber-500" />
          <h2 className="text-sm font-semibold text-slate-900">Leaderboard</h2>
        </div>
        {currentUser && <span className="text-xs font-medium text-indigo-600">You're #{currentUser.rank}</span>}
      </div>

      <div className="divide-y divide-slate-100">
        {mockLeaderboard.map((entry) => (
          <div
            key={entry.rank}
            className={`flex items-center justify-between px-5 py-2.5 ${entry.isCurrentUser ? "bg-indigo-50/60" : ""}`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  entry.rank <= 3 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {entry.rank}
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-semibold text-white">
                {entry.initials}
              </div>
              <span className={`text-sm ${entry.isCurrentUser ? "font-semibold text-indigo-700" : "text-slate-700"}`}>
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