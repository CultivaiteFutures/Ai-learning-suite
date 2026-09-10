import { Link } from "react-router-dom";
import { Users, BookOpen, Pencil, Trash2, Eye, Key, Lock } from "lucide-react";
import StatusBadge from "../common/StatusBadge";
import { useAuth } from "../../hooks/useAuth";

export default function CourseCard({ course, onDelete }) {
  const { user } = useAuth();
  const joinCode = course.joinCode || course.join_code || "";
  // Orphaned courses (no owning teacher on record) fall back to any teacher
  // being able to manage them, matching the backend's own fallback rule.
  const isOwner = !course.createdById || course.createdById === user?.id;

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{course.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {course.subject} · {course.grade}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={course.status} />
          {!isOwner && (
            <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
              <Lock size={10} /> View only
            </span>
          )}
        </div>
      </div>

      <p className="mt-3 line-clamp-3 text-sm text-slate-600">
        {course.description || "No description added yet."}
      </p>

      <div className="mt-3 flex items-center justify-between rounded-lg bg-indigo-50 px-3 py-1.5 text-xs">
        <span className="flex items-center gap-1 font-medium text-indigo-700">
          <Key size={13} /> Join Code:
        </span>
        <span className="font-mono font-bold tracking-wider text-indigo-900">{joinCode || "Not available"}</span>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Users size={13} /> {course.studentsEnrolled || 0} students
        </span>
        <span className="flex items-center gap-1">
          <BookOpen size={13} /> {course.lessonsCount || 0} lessons
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
        <Link
          to={`/teacher/courses/${course.id}`}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <Eye size={14} /> View
        </Link>
        {isOwner ? (
          <Link
            to={`/teacher/courses/${course.id}/edit`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
          >
            <Pencil size={14} />
          </Link>
        ) : (
          <span
            title="Only the course's teacher can edit this"
            className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-lg border border-slate-100 text-slate-300"
          >
            <Pencil size={14} />
          </span>
        )}
        {isOwner ? (
          <button
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 size={14} />
          </button>
        ) : (
          <span
            title="Only the course's teacher can delete this"
            className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-lg border border-slate-100 text-slate-300"
          >
            <Trash2 size={14} />
          </span>
        )}
      </div>
    </div>
  );
}