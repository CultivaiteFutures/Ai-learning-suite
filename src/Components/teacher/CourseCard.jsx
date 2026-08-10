import { Link } from "react-router-dom";
import { Users, BookOpen, Pencil, Trash2, Eye } from "lucide-react";
import StatusBadge from "../common/StatusBadge";

export default function CourseCard({ course, onDelete }) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{course.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {course.subject} · {course.grade}
          </p>
        </div>
        <StatusBadge status={course.status} />
      </div>

      <p className="mt-3 line-clamp-3 text-sm text-slate-600">
        {course.description || "No description added yet."}
      </p>

      <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Users size={13} /> {course.studentsEnrolled} students
        </span>
        <span className="flex items-center gap-1">
          <BookOpen size={13} /> {course.lessonsCount} lessons
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
        <Link
          to={`/teacher/courses/${course.id}`}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <Eye size={14} /> View
        </Link>
        <Link
          to={`/teacher/courses/${course.id}/edit`}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
        >
          <Pencil size={14} />
        </Link>
        <button
          onClick={onDelete}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}