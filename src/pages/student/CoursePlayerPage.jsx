import { useState, useEffect } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, PlayCircle, FileText, ClipboardCheck } from "lucide-react";
import LessonCard from "../../components/student/LessonCard";
import { useStudentProgress } from "../../context/StudentProgressContext";

const TYPE_ICONS = { video: PlayCircle, reading: FileText, quiz: ClipboardCheck };

export default function CoursePlayerPage() {
  const { courseId } = useParams();
  const { getCourseById, getLessonsByCourse, markLessonComplete } = useStudentProgress();

  const course = getCourseById(courseId);
  const lessons = getLessonsByCourse(courseId);

  const [activeLessonId, setActiveLessonId] = useState(null);

  useEffect(() => {
    if (lessons.length === 0) return;
    const firstIncomplete = lessons.find((l) => !l.completed);
    setActiveLessonId((firstIncomplete || lessons[0]).id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  if (!course) return <Navigate to="/student/courses" replace />;

  const activeIndex = lessons.findIndex((l) => l.id === activeLessonId);
  const activeLesson = lessons[activeIndex];

  if (!activeLesson) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        This course doesn't have any lessons yet.
      </div>
    );
  }

  const TypeIcon = TYPE_ICONS[activeLesson.type] || FileText;
  const hasPrevious = activeIndex > 0;
  const hasNext = activeIndex < lessons.length - 1;

  function goToPrevious() {
    if (hasPrevious) setActiveLessonId(lessons[activeIndex - 1].id);
  }

  function goToNext() {
    if (hasNext) setActiveLessonId(lessons[activeIndex + 1].id);
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] min-h-[500px] flex-col">
      <div className="mb-4 shrink-0">
        <Link to="/student/courses" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700">
          <ArrowLeft size={15} />
          Back to My Courses
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">{course.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {course.teacherName} · {course.completedLessons}/{course.totalLessons} lessons complete
        </p>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:flex-row">
        {/* Left: Lesson Navigation */}
        <div className="order-2 w-full shrink-0 overflow-y-auto border-t border-slate-200 lg:order-1 lg:w-72 lg:border-r lg:border-t-0">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Lessons</p>
          </div>
          <div className="space-y-0.5 p-2">
            {lessons.map((lesson, index) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                index={index}
                isActive={lesson.id === activeLessonId}
                onClick={() => setActiveLessonId(lesson.id)}
              />
            ))}
          </div>
        </div>

        {/* Right: Lesson Content */}
        <div className="order-1 flex flex-1 flex-col overflow-hidden lg:order-2">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-indigo-600">
              <TypeIcon size={14} />
              <span className="capitalize">{activeLesson.type}</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-400">{activeLesson.durationMinutes} min</span>
            </div>

            <h2 className="mt-2 text-xl font-semibold text-slate-900">{activeLesson.title}</h2>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600">{activeLesson.content}</p>

            {activeLesson.completed && (
              <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                <CheckCircle2 size={16} />
                You've completed this lesson
              </div>
            )}
          </div>

          {/* Bottom controls */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
            <button
              onClick={goToPrevious}
              disabled={!hasPrevious}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            <button
              onClick={() => markLessonComplete(activeLesson.id)}
              disabled={activeLesson.completed}
              className={`
                flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-semibold transition-colors
                ${
                  activeLesson.completed
                    ? "cursor-default bg-emerald-50 text-emerald-700"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }
              `}
            >
              <CheckCircle2 size={16} />
              {activeLesson.completed ? "Completed" : "Mark Complete"}
            </button>

            <button
              onClick={goToNext}
              disabled={!hasNext}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}