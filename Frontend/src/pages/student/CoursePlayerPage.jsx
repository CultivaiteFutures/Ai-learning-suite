import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, PlayCircle, FileText, ClipboardCheck, Sparkles, BookOpen, HelpCircle, Lock } from "lucide-react";
import LessonCard from "../../components/student/LessonCard";
import LessonNotesPanel from "../../components/student/LessonNotesPanel";
import { useStudentProgress } from "../../context/StudentProgressContext";
import { studentAPI } from "../../services/api";

const TYPE_ICONS = { video: PlayCircle, reading: FileText, quiz: ClipboardCheck };

export default function CoursePlayerPage() {
  const { courseId } = useParams();
  const { getCourseById, getLessonsByCourse, markLessonComplete, refreshEnrolledCourses } = useStudentProgress();

  const [loading, setLoading] = useState(true);
  const [localCourse, setLocalCourse] = useState(null);
  const [localLessons, setLocalLessons] = useState([]);
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [selectedQuizAnswers, setSelectedQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [moduleLockInfo, setModuleLockInfo] = useState({}); // moduleId -> { isLocked, lockLabel }

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const c = getCourseById(courseId);
    const l = getLessonsByCourse(courseId);

    if (c && l.length > 0) {
      setLocalCourse(c);
      setLocalLessons(l);
      const firstIncomplete = l.find((item) => !item.completed);
      setActiveLessonId((firstIncomplete || l[0]).id);
      setLoading(false);
    } else {
      // Fallback: fetch course detail from student API directly
      studentAPI.getCourseDetail(courseId).then((res) => {
        if (!isMounted) return;
        if (res.data) {
          const fetchedCourse = {
            id: res.data.id,
            name: res.data.title || res.data.name,
            title: res.data.title || res.data.name,
            description: res.data.description,
            subject: res.data.subject,
            grade: res.data.grade_level || res.data.grade,
            teacherName: "Course Instructor",
            modules: res.data.modules || []
          };
          setLocalCourse(fetchedCourse);

          const extractedLessons = [];
          (res.data.modules || []).forEach((m) => {
            (m.lessons || []).forEach((les, lIdx) => {
              extractedLessons.push({
                id: les.id,
                courseId: fetchedCourse.id,
                moduleId: m.id,
                moduleTitle: m.title || m.name || "Module",
                title: les.title || les.name,
                content: les.content || "",
                summary: les.summary || "",
                durationMinutes: les.duration_minutes || les.durationMinutes || 30,
                completed: false,
                order: lIdx,
                type: les.quiz ? "quiz" : "reading",
                activities: les.activities,
                quiz: les.quiz,
                homework: les.homework
              });
            });
          });
          setLocalLessons(extractedLessons);
          if (extractedLessons.length > 0) {
            setActiveLessonId(extractedLessons[0].id);
          }
        }
        setLoading(false);
      }).catch(() => {
        if (isMounted) setLoading(false);
      });
    }

    return () => { isMounted = false; };
  }, [courseId]);

  // Lock metadata (Scheduled Module Release / Module Prerequisites) always comes
  // from a fresh server read -- the context's cached enrolled-courses list doesn't
  // carry it, since it's computed per-student at request time.
  useEffect(() => {
    let isMounted = true;
    studentAPI.getCourseDetail(courseId).then((res) => {
      if (!isMounted || !res.data) return;
      const titleByModuleId = {};
      (res.data.modules || []).forEach((m) => {
        titleByModuleId[m.id] = m.title || m.name || "this module";
      });

      const info = {};
      (res.data.modules || []).forEach((m) => {
        const isLocked = !!(m.isLocked ?? m.is_locked);
        const lockReason = m.lockReason ?? m.lock_reason ?? null;
        const unlocksAt = m.unlocksAt ?? m.unlocks_at ?? null;
        const prerequisiteId = m.prerequisiteModuleId ?? m.prerequisite_module_id ?? null;

        let lockLabel = null;
        if (isLocked && lockReason === "scheduled" && unlocksAt) {
          const d = new Date(unlocksAt);
          lockLabel = Number.isNaN(d.getTime())
            ? "Unlocks soon"
            : `Unlocks ${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
        } else if (isLocked && lockReason === "prerequisite") {
          const prereqTitle = prerequisiteId ? titleByModuleId[prerequisiteId] : null;
          lockLabel = prereqTitle ? `Complete "${prereqTitle}" first` : "Complete the previous module first";
        } else if (isLocked) {
          lockLabel = "Locked";
        }

        info[m.id] = { isLocked, lockLabel };
      });
      setModuleLockInfo(info);
    }).catch(() => {
      if (isMounted) setModuleLockInfo({});
    });
    return () => { isMounted = false; };
  }, [courseId]);

  const course = localCourse || getCourseById(courseId);
  const rawLessons = localLessons.length > 0 ? localLessons : getLessonsByCourse(courseId);

  // Defense in depth only -- the real enforcement is server-side (403 on
  // .../lessons/{id}/complete). This just keeps the UI from letting a student
  // click into a lesson whose module isn't unlocked for them yet.
  const lessons = rawLessons.map((lesson) => {
    const lock = moduleLockInfo[lesson.moduleId];
    return { ...lesson, locked: !!lock?.isLocked, lockLabel: lock?.lockLabel || null };
  });

  const activeIndex = lessons.findIndex((l) => l.id === activeLessonId);
  const activeLesson = lessons[activeIndex >= 0 ? activeIndex : 0];

  function goToPrevious() {
    for (let i = activeIndex - 1; i >= 0; i--) {
      if (!lessons[i].locked) {
        setActiveLessonId(lessons[i].id);
        setSelectedQuizAnswers({});
        setQuizSubmitted(false);
        return;
      }
    }
  }

  function goToNext() {
    for (let i = activeIndex + 1; i < lessons.length; i++) {
      if (!lessons[i].locked) {
        setActiveLessonId(lessons[i].id);
        setSelectedQuizAnswers({});
        setQuizSubmitted(false);
        return;
      }
    }
  }

  function handleSelectLesson(id) {
    const target = lessons.find((l) => l.id === id);
    if (target?.locked) return;
    setActiveLessonId(id);
    setSelectedQuizAnswers({});
    setQuizSubmitted(false);
  }

  function handleQuizSelect(qIdx, opt) {
    setSelectedQuizAnswers((prev) => ({ ...prev, [qIdx]: opt }));
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-12rem)] min-h-[450px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Loading course curriculum...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex h-[calc(100vh-12rem)] flex-col items-center justify-center text-center">
        <BookOpen size={40} className="text-slate-300 mb-3" />
        <h2 className="text-lg font-semibold text-slate-800">Course not found</h2>
        <p className="mt-1 text-xs text-slate-500">You may need to join with a course code or the course was unpublished.</p>
        <Link to="/student/courses" className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700">
          Back to My Courses
        </Link>
      </div>
    );
  }

  if (!activeLesson || lessons.length === 0) {
    return (
      <div className="flex h-[calc(100vh-9rem)] flex-col">
        <div className="mb-4 shrink-0">
          <Link to="/student/courses" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700">
            <ArrowLeft size={15} /> Back to My Courses
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">{course.name || course.title}</h1>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <BookOpen size={48} className="text-indigo-200 mb-3" />
          <h3 className="text-base font-semibold text-slate-900">Curriculum in Preparation</h3>
          <p className="mt-1 max-w-md text-xs text-slate-500">
            Your instructor is currently preparing lessons and activities for this course. Please check back shortly!
          </p>
          <Link to="/student/courses" className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700">
            Return to Courses
          </Link>
        </div>
      </div>
    );
  }

  const TypeIcon = TYPE_ICONS[activeLesson.type] || FileText;
  const hasPrevious = lessons.slice(0, activeIndex).some((l) => !l.locked);
  const hasNext = lessons.slice(activeIndex + 1).some((l) => !l.locked);

  // Parse quiz if exists
  let quizQuestions = [];
  if (activeLesson.quiz) {
    if (Array.isArray(activeLesson.quiz)) {
      quizQuestions = activeLesson.quiz;
    } else if (typeof activeLesson.quiz === "string") {
      try {
        quizQuestions = JSON.parse(activeLesson.quiz);
      } catch {}
    }
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] min-h-[500px] flex-col">
      <div className="mb-4 shrink-0">
        <Link to="/student/courses" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700">
          <ArrowLeft size={15} />
          Back to My Courses
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-1">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{course.name || course.title}</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              {course.subject} · {lessons.filter((l) => l.completed).length}/{lessons.length} lessons complete
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-700">
              {activeLesson.moduleTitle || "Curriculum"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:flex-row">
        {/* Left: Lesson Navigation */}
        <div className="order-2 w-full shrink-0 overflow-y-auto border-t border-slate-200 lg:order-1 lg:w-80 lg:border-r lg:border-t-0 bg-slate-50/50">
          <div className="border-b border-slate-200 px-4 py-3 bg-white">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Course Syllabus ({lessons.length} Lessons)</p>
          </div>
          <div className="space-y-1 p-2">
            {lessons.map((lesson, index) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                index={index}
                isActive={lesson.id === activeLessonId}
                onClick={() => handleSelectLesson(lesson.id)}
                locked={lesson.locked}
                lockLabel={lesson.lockLabel}
              />
            ))}
          </div>
        </div>

        {/* Right: Lesson Content Workspace */}
        <div className="order-1 flex flex-1 flex-col overflow-hidden lg:order-2">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Lesson Meta Header */}
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">
                <TypeIcon size={14} />
                <span className="capitalize">{activeLesson.type || "Reading"}</span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-400">{activeLesson.durationMinutes} min</span>
              </div>
              <h2 className="mt-1.5 text-2xl font-bold text-slate-900">{activeLesson.title}</h2>
            </div>

            {activeLesson.locked && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-800">
                <Lock size={15} />
                This module is locked. {activeLesson.lockLabel || "Check back later."}
              </div>
            )}

            {/* Main Lesson Content */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3 flex items-center gap-1.5">
                <BookOpen size={14} className="text-indigo-600" /> Lesson Material
              </h3>
              <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                {activeLesson.content || activeLesson.summary || "No written content provided for this lesson."}
              </div>
            </div>

            {/* Personal notes, saved highlights, and bookmarking (Task #50) */}
            <LessonNotesPanel key={activeLesson.id} lessonId={activeLesson.id} />

            {/* Summary / Key Takeaways Highlight Box */}
            {activeLesson.summary && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wide text-indigo-900 mb-1 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-indigo-600" /> Key Takeaways
                </h4>
                <p className="text-xs leading-relaxed text-indigo-950 whitespace-pre-wrap">{activeLesson.summary}</p>
              </div>
            )}

            {/* Practice Activities / Homework Section */}
            {activeLesson.activities && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wide text-amber-900 mb-1.5">
                  Suggested Practice Activity
                </h4>
                <p className="text-xs text-amber-950 whitespace-pre-wrap">
                  {Array.isArray(activeLesson.activities) ? activeLesson.activities.join("\n") : String(activeLesson.activities)}
                </p>
              </div>
            )}

            {/* Interactive Comprehension Quiz Section */}
            {quizQuestions.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
                    <HelpCircle size={15} className="text-indigo-600" /> Comprehension Check ({quizQuestions.length} Questions)
                  </h4>
                  {quizSubmitted && (
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      Answers Checked
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {quizQuestions.map((q, qIdx) => (
                    <div key={qIdx} className="space-y-2 rounded-lg bg-slate-50 p-3.5 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-800">{qIdx + 1}. {q.question}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        {(q.options || []).map((opt, oIdx) => {
                          const isSelected = selectedQuizAnswers[qIdx] === opt;
                          const isCorrect = q.answer === opt;
                          let btnClass = "border-slate-200 bg-white text-slate-700 hover:bg-slate-100";
                          if (quizSubmitted) {
                            if (isCorrect) btnClass = "border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold";
                            else if (isSelected && !isCorrect) btnClass = "border-rose-300 bg-rose-50 text-rose-700";
                          } else if (isSelected) {
                            btnClass = "border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold";
                          }

                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => !quizSubmitted && handleQuizSelect(qIdx, opt)}
                              className={`flex items-center gap-2 rounded-lg border p-2.5 text-left text-xs transition ${btnClass}`}
                            >
                              <span className="h-4 w-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px] shrink-0">
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {!quizSubmitted ? (
                  <button
                    onClick={() => setQuizSubmitted(true)}
                    disabled={Object.keys(selectedQuizAnswers).length === 0}
                    className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Check Answers
                  </button>
                ) : (
                  <button
                    onClick={() => { setQuizSubmitted(false); setSelectedQuizAnswers({}); }}
                    className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Retry Quiz
                  </button>
                )}
              </div>
            )}

            {/* Completed badge */}
            {activeLesson.completed && (
              <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 border border-emerald-200">
                <CheckCircle2 size={16} />
                You've completed this lesson! (+50 XP)
              </div>
            )}
          </div>

          {/* Bottom navigation controls */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
            <button
              onClick={goToPrevious}
              disabled={!hasPrevious}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            <button
              onClick={() => markLessonComplete(activeLesson.id)}
              disabled={activeLesson.completed || activeLesson.locked}
              className={`
                flex items-center gap-1.5 rounded-lg px-5 py-2 text-xs font-semibold transition-colors shadow-sm
                ${
                  activeLesson.completed
                    ? "cursor-default bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : activeLesson.locked
                    ? "cursor-not-allowed bg-slate-100 text-slate-400"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }
              `}
            >
              {activeLesson.locked ? <Lock size={16} /> : <CheckCircle2 size={16} />}
              {activeLesson.completed ? "Lesson Completed" : activeLesson.locked ? "Locked" : "Mark as Complete"}
            </button>

            <button
              onClick={goToNext}
              disabled={!hasNext}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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