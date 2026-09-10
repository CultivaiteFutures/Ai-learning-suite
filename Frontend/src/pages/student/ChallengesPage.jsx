import { useState, useEffect, useCallback } from "react";
import { Swords, BookOpen, Globe2, Zap, Award, Trophy, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import ChallengeLeaderboard from "../../components/common/ChallengeLeaderboard";
import ChallengeQuizModal from "../../components/common/ChallengeQuizModal";
import { challengesAPI, studentAPI } from "../../services/api";

const STATUS_STYLES = {
  upcoming: "bg-amber-100 text-amber-700",
  active: "bg-emerald-100 text-emerald-700",
  ended: "bg-slate-200 text-slate-600",
};

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState([]);
  const [boards, setBoards] = useState({}); // challengeId -> leaderboard response
  const [stats, setStats] = useState({ xp: 0, badges: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [quizTarget, setQuizTarget] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    challengesAPI
      .getChallenges()
      .then(async (res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setChallenges(list);
        setError("");

        const entries = await Promise.all(
          list.map((c) =>
            challengesAPI
              .getLeaderboard(c.id)
              .then((r) => [c.id, r.data])
              .catch(() => [c.id, null])
          )
        );
        setBoards(Object.fromEntries(entries));
      })
      .catch(() => setError("Could not load challenges. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    studentAPI
      .getStats()
      .then((res) => {
        if (res.data) setStats(res.data);
      })
      .catch(() => {});
  }, []);

  function handleQuizSubmitted() {
    // Refresh both the challenge list (so hasSubmitted/myScore update) and
    // the student's XP card -- a first submission just paid out bonus XP.
    load();
    studentAPI
      .getStats()
      .then((res) => {
        if (res.data) setStats(res.data);
      })
      .catch(() => {});
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Challenges &amp; Competitions</h1>
        <p className="mt-1 text-sm text-slate-500">
          Take the quizzes your school and teachers have posted for your grade to earn bonus XP and badges.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Trophy size={19} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Your XP</p>
            <p className="mt-0.5 text-xl font-semibold text-slate-900">{stats.xp || 0} XP</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Award size={19} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Badges Earned</p>
            <p className="mt-0.5 text-xl font-semibold text-slate-900">{(stats.badges || []).length}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <LoadingState rows={4} columns={1} />
        ) : challenges.length === 0 ? (
          <EmptyState
            title="No challenges available yet"
            description="Check back once your school or teacher posts a new challenge for your grade."
            icon={Swords}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {challenges.map((c) => {
              const board = boards[c.id];
              const expanded = expandedId === c.id;
              const canTake = c.status !== "ended" && !c.hasSubmitted;

              return (
                <div key={c.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">{c.title}</h3>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                            STATUS_STYLES[c.status] || "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {c.status}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {c.targetGradeIds?.length ? <BookOpen size={12} /> : <Globe2 size={12} />}
                          {c.targetGradeIds?.length ? c.targetGradeNames.join(", ") : "School-wide"}
                        </span>
                      </div>
                      {c.description && (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                          {c.description}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span>
                          {new Date(c.startDate).toLocaleDateString()} &rarr; {new Date(c.endDate).toLocaleDateString()}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Zap size={12} className="text-amber-500" /> {c.bonusXp} bonus XP
                        </span>
                        {c.badgeName && (
                          <span className="inline-flex items-center gap-1">
                            <Award size={12} className="text-indigo-500" /> {c.badgeName} badge
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-slate-400">{c.questionCount} questions</span>
                        {c.hasSubmitted && c.myScore !== null && c.myScore !== undefined && (
                          <span className="inline-flex items-center gap-1 font-medium text-indigo-600">
                            Your score: {c.myScore}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {c.hasSubmitted ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 size={14} /> Completed
                        </span>
                      ) : (
                        <button
                          onClick={() => setQuizTarget(c)}
                          disabled={!canTake}
                          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                        >
                          {canTake ? "Take Quiz" : "Challenge ended"}
                        </button>
                      )}
                      {c.hasSubmitted && (
                        <button
                          onClick={() => setQuizTarget(c)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
                        >
                          Review answers
                        </button>
                      )}
                      <button
                        onClick={() => setExpandedId(expanded ? null : c.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
                      >
                        {expanded ? "Hide leaderboard" : "View leaderboard"}
                        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="mt-4">
                      <ChallengeLeaderboard
                        entries={board?.entries || []}
                        currentStudent={board?.currentStudent || null}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ChallengeQuizModal
        isOpen={!!quizTarget}
        onClose={() => setQuizTarget(null)}
        challengeSummary={quizTarget}
        onSubmitted={handleQuizSubmitted}
      />
    </div>
  );
}
