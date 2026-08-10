import { createContext, useContext, useState, useEffect, useMemo } from "react";
import mockStudentCourses from "../data/mockStudentCourses.json";
import mockCourseLessons from "../data/mockCourseLessons.json";

const StudentProgressContext = createContext(null);

const LESSONS_KEY = "ails_student_lessons";
const STATS_KEY = "ails_student_stats";
const DAILY_GOAL_MINUTES = 30;

function loadInitial(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export function StudentProgressProvider({ children }) {
  const [lessons, setLessons] = useState(() => loadInitial(LESSONS_KEY, mockCourseLessons));
  const [stats, setStats] = useState(() =>
    loadInitial(STATS_KEY, { xp: 2510, streakDays: 4, minutesToday: 15 })
  );

  useEffect(() => {
    localStorage.setItem(LESSONS_KEY, JSON.stringify(lessons));
  }, [lessons]);

  useEffect(() => {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }, [stats]);

  const courses = useMemo(() => {
    return mockStudentCourses.map((course) => {
      const courseLessons = lessons
        .filter((l) => l.courseId === course.id)
        .sort((a, b) => a.order - b.order);
      const total = courseLessons.length;
      const completed = courseLessons.filter((l) => l.completed).length;
      const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
      const status = percent === 100 ? "completed" : percent === 0 ? "not-started" : "in-progress";

      return { ...course, totalLessons: total, completedLessons: completed, progress: percent, status };
    });
  }, [lessons]);

  function getCourseById(courseId) {
    return courses.find((c) => c.id === courseId) || null;
  }

  function getLessonsByCourse(courseId) {
    return lessons.filter((l) => l.courseId === courseId).sort((a, b) => a.order - b.order);
  }

  function getLessonById(lessonId) {
    return lessons.find((l) => l.id === lessonId) || null;
  }

  function markLessonComplete(lessonId) {
    const lesson = lessons.find((l) => l.id === lessonId);
    if (!lesson || lesson.completed) return;

    setLessons((prev) => prev.map((l) => (l.id === lessonId ? { ...l, completed: true } : l)));
    setStats((prev) => ({
      ...prev,
      xp: prev.xp + 20,
      minutesToday: prev.minutesToday + lesson.durationMinutes,
    }));
  }

  function getContinueLearningCourse() {
    const inProgress = courses
      .filter((c) => c.status === "in-progress")
      .sort((a, b) => new Date(b.lastAccessed || 0) - new Date(a.lastAccessed || 0));
    return inProgress[0] || courses.find((c) => c.status === "not-started") || null;
  }

  function getRecentlyJoinedCourses(limit = 3) {
    return [...courses].sort((a, b) => new Date(b.enrolledDate) - new Date(a.enrolledDate)).slice(0, limit);
  }

  const level = Math.floor(stats.xp / 500) + 1;
  const xpIntoLevel = stats.xp % 500;

  return (
    <StudentProgressContext.Provider
      value={{
        courses,
        getCourseById,
        getLessonsByCourse,
        getLessonById,
        markLessonComplete,
        getContinueLearningCourse,
        getRecentlyJoinedCourses,
        xp: stats.xp,
        level,
        xpIntoLevel,
        streakDays: stats.streakDays,
        minutesToday: stats.minutesToday,
        dailyGoalMinutes: DAILY_GOAL_MINUTES,
      }}
    >
      {children}
    </StudentProgressContext.Provider>
  );
}

export function useStudentProgress() {
  const ctx = useContext(StudentProgressContext);
  if (!ctx) throw new Error("useStudentProgress must be used within StudentProgressProvider");
  return ctx;
}