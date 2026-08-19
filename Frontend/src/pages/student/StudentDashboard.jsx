import { useState } from "react";
import { Target, Zap, Key, Plus, CheckCircle2, AlertCircle } from "lucide-react";
import WelcomeCard from "../../components/student/WelcomeCard";
import CourseCard from "../../components/student/CourseCard";
import ProgressCard from "../../components/student/ProgressCard";
import UpcomingAssignmentsCard from "../../components/student/UpcomingAssignmentsCard";
import WeeklyProgressCard from "../../components/student/WeeklyProgressCard";
import BadgesCard from "../../components/student/BadgesCard";
import LeaderboardCard from "../../components/student/LeaderboardCard";
import { useStudentProgress } from "../../context/StudentProgressContext";

export default function StudentDashboard() {
  const {
    courses, joinCourse, getContinueLearningCourse, getRecentlyJoinedCourses, getUpcomingAssignments,
    xp, level, xpIntoLevel, minutesToday, dailyGoalMinutes,
  } = useStudentProgress();

  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState("");

  const continueLearningCourse = getContinueLearningCourse();
  const recentlyJoined = getRecentlyJoinedCourses(3);
  const upcomingAssignments = getUpcomingAssignments ? getUpcomingAssignments() : [];

  async function handleJoinCourse(e) {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setJoining(true);
    setJoinError("");
    setJoinSuccess("");

    try {
      const res = await joinCourse(joinCode.trim());
      setJoinSuccess(`Successfully joined "${res.name || res.title || 'Course'}"!`);
      setJoinCode("");
    } catch (err) {
      setJoinError(err.response?.data?.detail || "Invalid join code or course not available in your school.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="space-y-6">
      <WelcomeCard />

      {/* Join Course Card */}
      <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Key className="text-indigo-600" size={18} /> Join a New Course
            </h2>
            <p className="mt-1 text-xs text-slate-600">Enter the 6-character Join Code provided by your teacher (e.g. AI7K92).</p>
          </div>

          <form onSubmit={handleJoinCourse} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. AI7K92"
              maxLength={10}
              className="w-full sm:w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono uppercase font-bold text-slate-900 placeholder:font-sans placeholder:normal-case placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={joining || !joinCode.trim()}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              <Plus size={14} /> {joining ? "Joining..." : "Join Course"}
            </button>
          </form>
        </div>

        {joinSuccess && (
          <div className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg p-2.5 border border-emerald-200">
            <CheckCircle2 size={15} /> {joinSuccess}
          </div>
        )}

        {joinError && (
          <div className="mt-3 flex items-center gap-2 text-xs font-medium text-rose-700 bg-rose-50 rounded-lg p-2.5 border border-rose-200">
            <AlertCircle size={15} /> {joinError}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
        <ProgressCard
          title="Daily Goal"
          icon={Target}
          accent="emerald"
          variant="ring"
          percent={dailyGoalMinutes ? (minutesToday / dailyGoalMinutes) * 100 : 0}
          valueLabel={`${minutesToday}/${dailyGoalMinutes} min`}
          footer="Minutes studied today"
        />
        <ProgressCard
          title="Experience Points"
          icon={Zap}
          accent="amber"
          variant="bar"
          percent={(xpIntoLevel / 500) * 100}
          valueLabel={`Level ${level} · ${xp.toLocaleString()} XP`}
          footer={`${xpIntoLevel}/500 XP to next level`}
        />
      </div>

      {continueLearningCourse && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Continue Learning</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <CourseCard course={continueLearningCourse} size="large" />
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Enrolled Courses</h2>
        {recentlyJoined.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No courses joined yet. Ask your teacher for a Course Join Code above!
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentlyJoined.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <WeeklyProgressCard />
          <UpcomingAssignmentsCard assignments={upcomingAssignments} />
        </div>
        <div className="space-y-6">
          <LeaderboardCard />
        </div>
      </div>

      <BadgesCard />
    </div>
  );
}