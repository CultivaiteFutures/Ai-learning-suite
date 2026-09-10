import { CheckCircle2, Circle, Lock } from "lucide-react";

export default function LessonCard({ lesson, index, isActive, onClick, locked = false, lockLabel }) {
  return (
    <button
      onClick={locked ? undefined : onClick}
      disabled={locked}
      title={locked ? lockLabel : undefined}
      className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
        locked
          ? "cursor-not-allowed opacity-60"
          : isActive
          ? "bg-indigo-50"
          : "hover:bg-slate-50"
      }`}
    >
      <span className="mt-0.5 shrink-0">
        {locked ? (
          <Lock size={18} className="text-slate-300" />
        ) : lesson.completed ? (
          <CheckCircle2 size={18} className="text-emerald-500" />
        ) : (
          <Circle size={18} className={isActive ? "text-indigo-500" : "text-slate-300"} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${isActive && !locked ? "text-indigo-700" : "text-slate-700"}`}>
          {index + 1}. {lesson.title}
        </p>
        {lesson.moduleName && <p className="mt-0.5 truncate text-xs text-slate-400">{lesson.moduleName}</p>}
        {locked && lockLabel && <p className="mt-0.5 truncate text-xs font-medium text-amber-600">{lockLabel}</p>}
      </div>
    </button>
  );
}
