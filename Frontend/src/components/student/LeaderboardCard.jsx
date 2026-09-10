import { useState, useEffect } from "react";
import { Trophy } from "lucide-react";
import { studentAPI } from "../../services/api";

function initialsFor(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const letters = parts.length > 1 ? [parts[0][0], parts[parts.length - 1][0]] : [parts[0][0]];
  return letters.join("").toUpperCase();
}

const RANK_BADGE_COLORS = {
  1: "bg-amber-100 text-amber-700",
  2: "bg-slate-200 text-slate-600",
  3: "bg-orange-100 text-orange-700",
};

export default function LeaderboardCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    studentAPI.getLeaderboard()
      .then((res) => {
        if (!cancelled) setData(res.data || null);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load the leaderboard right now.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const top = data?.top || [];
  const currentStudent = data?.current_student || null;
  const currentInTop = currentStudent ? top.some((e) => e.is_current_user) : false;

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-amber-500" />
          <h2 className="text-sm font-semibold text-slate-900">Leaderboard</h2>
        </div>
        {currentStudent && (
          <span className="text-xs font-medium text-indigo-600">
            You're #{currentStudent.rank}
          </span>
        )}
      </div>

      {loading ? (
        <p className="px-5 py-6 text-sm text-slate-400">Loading leaderboard...</p>
      ) : error ? (
        <p className="px-5 py-6 text-sm text-rose-500">{error}</p>
      ) : top.length === 0 ? (
        <p className="px-5 py-6 text-sm text-slate-400">No leaderboard data yet — be the first to earn XP!</p>
      ) : (
        <>
          <div className="divide-y divide-slate-100">
            {top.map((entry) => (
              <div
                key={entry.student_id}
                className={`flex items-center justify-between px-5 py-3 ${entry.is_current_user ? "bg-indigo-50/60" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                      RANK_BADGE_COLORS[entry.rank] || "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {entry.rank}
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-semibold text-white">
                    {initialsFor(entry.full_name)}
                  </div>
                  <span className={`text-sm font-semibold ${entry.is_current_user ? "text-indigo-700" : "text-slate-700"}`}>
                    {entry.is_current_user ? `${entry.full_name} (You)` : entry.full_name}
                  </span>
                </div>
                <span className="text-xs font-medium text-slate-500">{(entry.xp || 0).toLocaleString()} XP</span>
              </div>
            ))}
          </div>

          {currentStudent && !currentInTop && (
            <div className="flex items-center justify-between border-t border-slate-100 bg-indigo-50/40 px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                  {currentStudent.rank}
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-semibold text-white">
                  {initialsFor(currentStudent.full_name)}
                </div>
                <span className="text-sm font-semibold text-indigo-700">
                  {currentStudent.full_name} (You)
                </span>
              </div>
              <span className="text-xs font-medium text-slate-500">{(currentStudent.xp || 0).toLocaleString()} XP</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
