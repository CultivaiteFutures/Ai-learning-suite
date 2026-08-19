import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { studentAPI } from "../services/api";

const StudentProgressContext = createContext(null);
const DAILY_GOAL_MINUTES = 30;

export function StudentProgressProvider({ children }) {
  const [studentCourses, setStudentCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [stats, setStats] = useState({ xp: 0, streakDays: 0, minutesToday: 0 });

  // Fetch real enrolled courses, assignments, and student stats exclusively from FastAPI backend
  const refreshEnrolledCourses = async () => {
    const token = localStorage.getItem("token") || localStorage.getItem("ails_token");
    if (!token) return;

    try {
      const resStats = await studentAPI.getStats();
      if (resStats.data) {
        setStats((prev) => ({
          ...prev,
          xp: resStats.data.xp !== undefined ? resStats.data.xp : prev.xp,
          streakDays: resStats.data.streak_days !== undefined ? resStats.data.streak_days : prev.streakDays,
        }));
      }

      const resCourses = await studentAPI.getEnrolledCourses();
      if (resCourses.data && Array.isArray(resCourses.data)) {
        const fetchedCourses = resCourses.data.map((c) => ({
          id: c.id,
          title: c.title || c.name,
          name: c.title || c.name,
          description: c.description,
          subject: c.subject,
          grade: c.grade_level || c.grade,
          joinCode: c.join_code || c.joinCode,
          enrolledDate: c.created_at ? c.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
          lastAccessed: new Date().toISOString(),
          modules: c.modules || []
        }));
        setStudentCourses(fetchedCourses);

        // Flatten lessons
        const allLessons = [];
        fetchedCourses.forEach((c) => {
          (c.modules || []).forEach((m) => {
            (m.lessons || []).forEach((l, lIdx) => {
              allLessons.push({
                id: l.id,
                courseId: c.id,
                moduleId: m.id,
                title: l.title || l.name,
                content: l.content || "",
                durationMinutes: l.duration_minutes || 30,
                completed: false,
                order: lIdx
              });
            });
          });
        });
        setLessons(allLessons);
      } else {
        setStudentCourses([]);
        setLessons([]);
      }

      const resAssignments = await studentAPI.getAssignments();
      if (resAssignments.data && Array.isArray(resAssignments.data)) {
        setAssignments(resAssignments.data.map((a) => ({
          id: a.id,
          courseId: a.course_id,
          title: a.title,
          description: a.description,
          dueDate: a.due_date ? a.due_date.slice(0, 10) : "",
          maxPoints: a.max_points || 100,
        })));
      }
    } catch (err) {
      setStudentCourses([]);
      setLessons([]);
      setAssignments([]);
    }
  };

  useEffect(() => {
    refreshEnrolledCourses();
  }, []);

  async function joinCourse(code) {
    const res = await studentAPI.joinCourse(code);
    await refreshEnrolledCourses();
    return res.data;
  }

  async function submitAssignment(assignmentId, data) {
    const res = await studentAPI.submitAssignment(assignmentId, data);
    return res.data;
  }

  function getUpcomingAssignments() {
    return assignments;
  }

  const courses = useMemo(() => {
    return studentCourses.map((course) => {
      const courseLessons = lessons
        .filter((l) => l.courseId === course.id)
        .sort((a, b) => a.order - b.order);
      const total = courseLessons.length;
      const completed = courseLessons.filter((l) => l.completed).length;
      const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
      const status = percent === 100 ? "completed" : percent === 0 ? "not-started" : "in-progress";

      return { ...course, totalLessons: total, completedLessons: completed, progress: percent, status };
    });
  }, [studentCourses, lessons]);

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

    studentAPI.markLessonComplete(lessonId).then((res) => {
      if (res.data) {
        setStats((prev) => ({
          ...prev,
          xp: res.data.xp || prev.xp + 20,
          streakDays: res.data.streak || prev.streakDays,
          minutesToday: prev.minutesToday + (lesson.durationMinutes || 15)
        }));
      }
    }).catch(() => {
      setStats((prev) => ({
        ...prev,
        xp: prev.xp + 20,
        minutesToday: prev.minutesToday + (lesson.durationMinutes || 15),
      }));
    });

    setLessons((prev) => prev.map((l) => (l.id === lessonId ? { ...l, completed: true } : l)));
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
        assignments,
        joinCourse,
        submitAssignment,
        getUpcomingAssignments,
        refreshEnrolledCourses,
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