import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, BookOpen, FileText, ClipboardList, Loader2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { studentAPI, teacherAPI, schoolAdminAPI } from "../../services/api";

const TYPE_ICONS = { course: BookOpen, lesson: FileText, assignment: ClipboardList };

/**
 * Task #52: real global search across course content (courses, lessons,
 * assignments), scoped server-side to whatever the signed-in role is
 * allowed to see (a student's own enrolled courses, a teacher's own/
 * co-taught courses, or everything in the school for an Admin).
 */
export default function SearchBar({ placeholder = "Search courses, lessons, assignments..." }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const role = (user?.role || "").toLowerCase();
  const searchFn = role === "student" ? studentAPI.search : role === "teacher" ? teacherAPI.search : role === "admin" ? schoolAdminAPI.search : null;

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchFn || value.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      searchFn(value.trim())
        .then((res) => setResults(Array.isArray(res.data) ? res.data : []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [value, searchFn]);

  function handleChange(e) {
    setValue(e.target.value);
    setOpen(true);
  }

  function handleResultClick(result) {
    setOpen(false);
    if (role === "student") {
      navigate(`/student/courses/${result.course_id}/learn`);
    } else if (role === "teacher") {
      navigate(`/teacher/courses/${result.course_id}`);
    }
    // Admin has no single-course viewer today -- results are informational only.
  }

  const clickable = role === "student" || role === "teacher";

  return (
    <div ref={containerRef} className="relative hidden w-full max-w-sm md:block">
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
        <Search size={16} />
      </div>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
      />

      {open && value.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-3 text-xs text-slate-400">
              <Loader2 size={14} className="animate-spin" /> Searching...
            </div>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-xs text-slate-400">No matches for "{value.trim()}".</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {results.map((r) => {
                const Icon = TYPE_ICONS[r.type] || FileText;
                return (
                  <li key={`${r.type}-${r.id}`}>
                    <button
                      type="button"
                      onClick={() => handleResultClick(r)}
                      disabled={!clickable}
                      className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left hover:bg-slate-50 disabled:cursor-default disabled:hover:bg-white"
                    >
                      <Icon size={15} className="mt-0.5 shrink-0 text-indigo-500" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-800">{r.title}</p>
                        <p className="truncate text-[11px] text-slate-400">
                          {r.type === "course" ? "Course" : r.type === "lesson" ? "Lesson" : "Assignment"} · {r.course_name}
                        </p>
                        {r.snippet && <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{r.snippet}</p>}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
