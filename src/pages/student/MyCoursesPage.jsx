import { useState, useEffect, useMemo } from "react";
import { BookOpen, CheckCircle2, PlayCircle } from "lucide-react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import TableToolbar from "../../components/table/TableToolbar";
import Pagination from "../../components/table/Pagination";
import CourseCard from "../../components/student/CourseCard";
import EmptyState from "../../components/common/EmptyState";
import { useStudentProgress } from "../../context/StudentProgressContext";
import { useDataTable } from "../../hooks/useDataTable";

export default function MyCoursesPage() {
  const { courses } = useStudentProgress();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const subjectOptions = useMemo(() => {
    const subjects = Array.from(new Set(courses.map((c) => c.subject)));
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
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">My Courses</h1>
        <p className="mt-1 text-sm text-slate-500">Track your progress across all your enrolled courses.</p>
      </div>

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
            <EmptyState title="No courses found" description="Try adjusting your search or filters." icon={BookOpen} />
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