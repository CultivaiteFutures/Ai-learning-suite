import { Trophy } from "lucide-react";

/**
 * Reusable per-challenge leaderboard list. Visual language matches the
 * existing XP leaderboard (src/components/student/LeaderboardCard.jsx) --
 * same rank-badge colors, initials avatar, and "You" highlight treatment --
 * so a leaderboard looks like a leaderboard everywhere in this app.
 *
 * Unlike LeaderboardCard (which fetches /student/leaderboard itself), this
 * component is presentational: the parent page fetches
 * challengesAPI.getLeaderboard(challengeId) and passes the response down,
 * since it's reused by the teacher, admin, and student Challenges pages.
 *
 * `entries` / `currentStudent` are the camelCase shape returned by
 * GET /challenges/{id}/leaderboard (rank, studentId, fullName, score,
 * completedAt, isCurrentUser).
 */

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

function LeaderboardRow({ entry, trailing = false }) {
  return (
    <div
      className={`flex items-center justify-between px-5 py-3 ${
        entry.isCurrentUser ? "bg-indigo-50/60" : ""
      } ${trailing ? "border-t border-slate-100 bg-indigo-50/40" : ""}`}
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
          {initialsFor(entry.fullName)}
        </div>
        <span className={`text-sm font-semibold ${entry.isCurrentUser ? "text-indigo-700" : "text-slate-700"}`}>
          {entry.isCurrentUser ? `${entry.fullName} (You)` : entry.fullName}
        </span>
      </div>
      <span className="text-xs font-medium text-slate-500">
        {entry.score === null || entry.score === undefined ? "Not yet scored" : `${entry.score} pts`}
      </span>
    </div>
  );
}

export default function ChallengeLeaderboard({ entries = [], currentStudent = null, loading = false, error = "" }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <Trophy size={16} className="text-amber-500" />
        <h2 className="text-sm font-semibold text-slate-900">Leaderboard</h2>
      </div>

      {loading ? (
        <p className="px-5 py-6 text-sm text-slate-400">Loading leaderboard...</p>
      ) : error ? (
        <p className="px-5 py-6 text-sm text-rose-500">{error}</p>
      ) : entries.length === 0 ? (
        <p className="px-5 py-6 text-sm text-slate-400">No one has joined yet — be the first!</p>
      ) : (
        <>
          <div className="divide-y divide-slate-100">
            {entries.map((entry) => (
              <LeaderboardRow key={entry.studentId} entry={entry} />
            ))}
          </div>
          {currentStudent && <LeaderboardRow entry={currentStudent} trailing />}
        </>
      )}
    </div>
  );
}
