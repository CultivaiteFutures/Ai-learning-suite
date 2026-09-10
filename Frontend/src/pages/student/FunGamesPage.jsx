import { useEffect, useMemo, useState } from "react";
import {
  Gamepad2,
  Brain,
  Shuffle,
  Puzzle as PuzzleIcon,
  Layers,
  Zap,
  Play,
  AlertCircle,
} from "lucide-react";
import Modal from "../../components/ui/Modal";
import DashboardCard from "../../components/dashboard/DashboardCard";
import EmptyState from "../../components/common/EmptyState";
import { studentAPI } from "../../services/api";
import MemoryGame from "../../components/games/MemoryGame";
import MatchingGame from "../../components/games/MatchingGame";
import PuzzleGame from "../../components/games/PuzzleGame";
import QuizMatchGame from "../../components/games/QuizMatchGame";
import TriviaGame from "../../components/games/TriviaGame";
import FlashcardGame from "../../components/games/FlashcardGame";

// NOTE ON DATA SHAPE: GET /student/games (app/api/v1/student.py) has no
// response_model, so it returns the raw EvaluationGame ORM fields in
// snake_case (game_type, course_id, is_published, created_at, lesson_id) --
// unlike this app's schema-backed endpoints, which camelCase everything via
// BaseSchema. Every field read below checks the snake_case name first (with
// a camelCase fallback) to match what that endpoint actually sends.

const GAME_TYPE_META = {
  quiz_match: { label: "Quiz Match", icon: Gamepad2, color: "text-indigo-600 bg-indigo-50" },
  trivia: { label: "Trivia", icon: Zap, color: "text-amber-600 bg-amber-50" },
  flashcard: { label: "Flashcards", icon: Layers, color: "text-emerald-600 bg-emerald-50" },
  memory: { label: "Memory Match", icon: Brain, color: "text-purple-600 bg-purple-50" },
  matching: { label: "Matching", icon: Shuffle, color: "text-rose-600 bg-rose-50" },
  puzzle: { label: "Word Puzzle", icon: PuzzleIcon, color: "text-sky-600 bg-sky-50" },
};

const PLAYER_BY_TYPE = {
  quiz_match: QuizMatchGame,
  trivia: TriviaGame,
  flashcard: FlashcardGame,
  memory: MemoryGame,
  matching: MatchingGame,
  puzzle: PuzzleGame,
};

function gameType(game) {
  return game.game_type || game.gameType || "quiz_match";
}
function gameCourseId(game) {
  return game.course_id || game.courseId;
}

export default function FunGamesPage() {
  const [games, setGames] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [activeGame, setActiveGame] = useState(null);
  const [submitStatus, setSubmitStatus] = useState(null); // "saving" | "saved" | "error" | null

  useEffect(() => {
    setLoading(true);
    Promise.all([studentAPI.getGames(), studentAPI.getEnrolledCourses()])
      .then(([gamesRes, coursesRes]) => {
        setGames(Array.isArray(gamesRes.data) ? gamesRes.data : []);
        setCourses(Array.isArray(coursesRes.data) ? coursesRes.data : []);
        setError("");
      })
      .catch(() => setError("Could not load games right now. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  const courseById = useMemo(() => {
    const map = {};
    courses.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [courses]);

  const courseOptions = useMemo(() => {
    const seen = new Set();
    const opts = [];
    games.forEach((g) => {
      const cid = gameCourseId(g);
      const course = courseById[cid];
      if (cid && !seen.has(cid)) {
        seen.add(cid);
        opts.push({ value: cid, label: course?.title || course?.name || "Course" });
      }
    });
    return opts;
  }, [games, courseById]);

  const filteredGames = useMemo(() => {
    return games.filter((g) => {
      if (typeFilter !== "all" && gameType(g) !== typeFilter) return false;
      if (courseFilter !== "all" && gameCourseId(g) !== courseFilter) return false;
      return true;
    });
  }, [games, typeFilter, courseFilter]);

  const typeCounts = useMemo(() => {
    const counts = {};
    games.forEach((g) => {
      const t = gameType(g);
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  }, [games]);

  function openGame(game) {
    setActiveGame(game);
    setSubmitStatus(null);
  }

  function closeGame() {
    setActiveGame(null);
    setSubmitStatus(null);
  }

  async function handleComplete(score) {
    if (!activeGame) return;
    setSubmitStatus("saving");
    try {
      await studentAPI.submitGameScore(activeGame.id, score);
      setSubmitStatus("saved");
    } catch (err) {
      setSubmitStatus("error");
    }
  }

  const Player = activeGame ? PLAYER_BY_TYPE[gameType(activeGame)] : null;
  const activeCourse = activeGame ? courseById[gameCourseId(activeGame)] : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Fun Games</h1>
        <p className="mt-1 text-sm text-slate-500">
          Play quick, interactive games created by your teachers -- earn XP for every game you finish.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(GAME_TYPE_META).map(([type, meta]) => {
          const Icon = meta.icon;
          return (
            <DashboardCard
              key={type}
              label={meta.label}
              value={typeCounts[type] || 0}
              icon={Icon}
              accent={type === "trivia" ? "amber" : type === "matching" ? "rose" : "indigo"}
            />
          );
        })}
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTypeFilter("all")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                typeFilter === "all" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Types
            </button>
            {Object.entries(GAME_TYPE_META).map(([type, meta]) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  typeFilter === type ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {meta.label}
              </button>
            ))}
          </div>

          {courseOptions.length > 0 && (
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="all">All Courses</option>
              {courseOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Loading games...</div>
        ) : filteredGames.length === 0 ? (
          <EmptyState
            icon={Gamepad2}
            title="No games available yet"
            description="Your teachers haven't published any games for your courses yet -- check back soon."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredGames.map((game) => {
              const meta = GAME_TYPE_META[gameType(game)] || GAME_TYPE_META.quiz_match;
              const Icon = meta.icon;
              const course = courseById[gameCourseId(game)];
              return (
                <div
                  key={game.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div>
                    <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${meta.color}`}>
                      <Icon size={19} />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">{game.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">{course?.title || course?.name || "Course"}</p>
                    <span className={`mt-2 inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${meta.color}`}>
                      {meta.label}
                    </span>
                  </div>
                  <button
                    onClick={() => openGame(game)}
                    className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    <Play size={14} /> Play
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal isOpen={!!activeGame} onClose={closeGame} title={activeGame?.title || "Game"} maxWidth="max-w-2xl">
        {submitStatus === "error" && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            <AlertCircle size={14} /> Could not save your score. Your progress on this attempt was not recorded.
          </div>
        )}
        {submitStatus === "saving" && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
            Saving your score...
          </div>
        )}
        {submitStatus === "saved" && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
            Score saved -- XP added to your account.
          </div>
        )}
        {activeCourse && (
          <p className="mb-4 -mt-2 text-xs text-slate-400">{activeCourse.title || activeCourse.name}</p>
        )}
        {Player && activeGame && <Player config={activeGame.config} onComplete={handleComplete} />}
      </Modal>
    </div>
  );
}
