import { Link } from "react-router-dom";
import { Calculator, FlaskConical, PenTool, Landmark, Code, Palette, Music2, Dumbbell, BookOpen, PlayCircle } from "lucide-react";
import { formatRelativeDate } from "../../utils/formatDate";

const SUBJECT_ICONS = {
  Mathematics: Calculator,
  Science: FlaskConical,
  English: PenTool,
  History: Landmark,
  "Computer Science": Code,
  Art: Palette,
  Music: Music2,
  "Physical Education": Dumbbell,
};

const THUMBNAIL_STYLES = {
  indigo: "bg-gradient-to-br from-indigo-500 to-indigo-700",
  emerald: "bg-gradient-to-br from-emerald-500 to-emerald-700",
  amber: "bg-gradient-to-br from-amber-500 to-amber-700",
  violet: "bg-gradient-to-br from-violet-500 to-violet-700",
  rose: "bg-gradient-to-br from-rose-500 to-rose-700",
};

export default function CourseCard({ course, size = "default" }) {
  const Icon = SUBJECT_ICONS[course.subject] || BookOpen;
  const thumbnailClass = THUMBNAIL_STYLES[course.thumbnailColor] || THUMBNAIL_STYLES.indigo;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className={`relative flex h-28 items-center justify-center ${thumbnailClass}`}>
        <Icon size={size === "large" ? 40 : 32} className="text-white/90" strokeWidth={1.75} />
        <span className="absolute right-3 top-3 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
          {course.subject}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="truncate text-sm font-semibold text-slate-900">{course.name}</p>
        <p className="mt-0.5 text-xs text-slate-500">{course.teacherName}</p>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-600">{course.progress}% complete</span>
            <span className="text-slate-400">
              {course.completedLessons}/{course.totalLessons} lessons
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-500"
              style={{ width: `${course.progress}%` }}
            />
          </div>
        </div>

        <p className="mt-2.5 text-xs text-slate-400">Last accessed: {formatRelativeDate(course.lastAccessed)}</p>

        <Link
          to={`/student/courses/${course.id}/learn`}
          className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
        >
          <PlayCircle size={14} />
          {course.status === "not-started" ? "Start Course" : course.status === "completed" ? "Review Course" : "Continue"}
        </Link>
      </div>
    </div>
  );
}