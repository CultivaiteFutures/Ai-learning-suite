import { useState, useEffect, useMemo } from "react";
import { BookOpen, CheckCircle2, PlayCircle, Key, Plus, AlertCircle } from "lucide-react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import TableToolbar from "../../components/table/TableToolbar";
import Pagination from "../../components/table/Pagination";
import CourseCard from "../../components/student/CourseCard";
import EmptyState from "../../components/common/EmptyState";
import { useStudentProgress } from "../../context/StudentProgressContext";
import { useDataTable } from "../../hooks/useDataTable";

export default function MyCoursesPage() {
  const { courses, joinCourse } = useStudentProgress();
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  async function handleJoinCourse(e) {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setJoining(true);
    setJoinError("");
    setJoinSuccess("");

    try {
      const res = await joinCourse(joinCode.trim());
      setJoinSuccess(`Successfully joined "${res.name || res.title || 'Course'}"!`);
      setJoinCode("");
    } catch (err) {
      setJoinError(err.response?.data?.detail || "Invalid join code or course not available in your school.");
    } finally {
      setJoining(false);
    }
  }

  const subjectOptions = useMemo(() => {
    const subjects = Array.from(new Set(courses.map((c) => c.subject).filter(Boolean)));
    return [{ value: "all", label: "All Subjects" }, ...subjects.map((s) => ({ value: s, label: s }))];
  }, [courses]);

  const {
    paginatedData,
    searchTerm,
    setSearchTerm,
    filters,
    setFilter,
    currentPage,
    setCurrentPage,
    totalPages,
    pageSize,
    totalItems,
  } = useDataTable({
    data: courses,
    searchFields: ["name", "teacherName", "subject"],
    defaultSort: { key: "name", direction: "asc" },
    pageSize: 6,
  });

  const stats = useMemo(
    () => ({
      total: courses.length,
      inProgress: courses.filter((c) => c.status === "in-progress").length,
      completed: courses.filter((c) => c.status === "completed").length,
    }),
    [courses]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My Courses</h1>
          <p className="mt-1 text-sm text-slate-500">Track your progress across all your enrolled courses.</p>
        </div>

        <form onSubmit={handleJoinCourse} className="flex items-center gap-2">
          <div className="relative">
            <Key className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Join Code (e.g. AI7K92)"
              maxLength={10}
              className="w-48 rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs font-mono font-bold uppercase text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={joining || !joinCode.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus size={14} /> Join
          </button>
        </form>
      </div>

      {joinSuccess && (
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg p-3 border border-emerald-200">
          <CheckCircle2 size={16} /> {joinSuccess}
        </div>
      )}

      {joinError && (
        <div className="flex items-center gap-2 text-xs font-medium text-rose-700 bg-rose-50 rounded-lg p-3 border border-rose-200">
          <AlertCircle size={16} /> {joinError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashboardCard label="Enrolled Courses" value={stats.total} icon={BookOpen} accent="indigo" />
        <DashboardCard label="In Progress" value={stats.inProgress} icon={PlayCircle} accent="amber" />
        <DashboardCard label="Completed" value={stats.completed} icon={CheckCircle2} accent="emerald" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <TableToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search courses by name, teacher, subject..."
          filters={[
            { key: "subject", value: filters.subject || "all", onChange: (v) => setFilter("subject", v), options: subjectOptions },
            {
              key: "status",
              value: filters.status || "all",
              onChange: (v) => setFilter("status", v),
              options: [
                { value: "all", label: "All Status" },
                { value: "in-progress", label: "In Progress" },
                { value: "completed", label: "Completed" },
                { value: "not-started", label: "Not Started" },
              ],
            },
          ]}
        />

        <div className="p-4">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : paginatedData.length === 0 ? (
            <EmptyState title="No courses found" description="Enter a Join Code from your teacher above to enroll in a course." icon={BookOpen} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedData.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </div>

        {!loading && totalItems > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={totalItems}
            pageSize={pageSize}
          />
        )}
      </div>
    </div>
  );
}