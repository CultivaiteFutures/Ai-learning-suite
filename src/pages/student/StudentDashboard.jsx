import { Target, Zap } from "lucide-react";
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
    getContinueLearningCourse, getRecentlyJoinedCourses, getUpcomingAssignments,
    xp, level, xpIntoLevel, minutesToday, dailyGoalMinutes,
  } = useStudentProgress();

  const continueLearningCourse = getContinueLearningCourse();
  const recentlyJoined = getRecentlyJoinedCourses(3);
  const upcomingAssignments = getUpcomingAssignments();

  return (
    <div className="space-y-6">
      <WelcomeCard />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
        <ProgressCard
          title="Daily Goal"
          icon={Target}
          accent="emerald"
          variant="ring"
          percent={(minutesToday / dailyGoalMinutes) * 100}
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
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Recently Joined Courses</h2>
        {recentlyJoined.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
            No courses yet — check back once your teacher publishes a course.
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