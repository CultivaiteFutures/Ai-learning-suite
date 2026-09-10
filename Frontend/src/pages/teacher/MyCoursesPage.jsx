import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, CheckCircle2, FileEdit } from "lucide-react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import TableToolbar from "../../components/table/TableToolbar";
import Pagination from "../../components/table/Pagination";
import CourseCard from "../../components/teacher/CourseCard";
import EmptyState from "../../components/common/EmptyState";
import ConfirmationDialog from "../../components/common/ConfirmationDialog";
import { useCourses } from "../../context/CourseContext";
import { useDataTable } from "../../hooks/useDataTable";

export default function MyCoursesPage() {
  const navigate = useNavigate();
  const { courses, deleteCourse, courseError, clearCourseError } = useCourses();
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

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
    searchFields: ["name", "subject", "grade"],
    defaultSort: { key: "name", direction: "asc" },
    pageSize: 6,
  });

  const stats = useMemo(
    () => ({
      total: courses.length,
      published: courses.filter((c) => c.status === "published").length,
      draft: courses.filter((c) => c.status === "draft").length,
    }),
    [courses]
  );

  async function confirmDelete() {
    setDeleting(true);
    const ok = await deleteCourse(deleteTarget.id);
    setDeleting(false);
    if (ok) setDeleteTarget(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">My Courses</h1>
        <p className="mt-1 text-sm text-slate-500">Manage the courses you've created for your students.</p>
      </div>

      {courseError && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>{courseError}</span>
          <button onClick={clearCourseError} className="font-medium text-rose-600 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashboardCard label="Total Courses" value={stats.total} icon={BookOpen} accent="indigo" />
        <DashboardCard label="Published" value={stats.published} icon={CheckCircle2} accent="emerald" />
        <DashboardCard label="Drafts" value={stats.draft} icon={FileEdit} accent="amber" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <TableToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search courses by name, subject, grade..."
          filters={[
            { key: "subject", value: filters.subject || "all", onChange: (v) => setFilter("subject", v), options: subjectOptions },
            {
              key: "status",
              value: filters.status || "all",
              onChange: (v) => setFilter("status", v),
              options: [
                { value: "all", label: "All Status" },
                { value: "published", label: "Published" },
                { value: "draft", label: "Draft" },
              ],
            },
          ]}
          onAddClick={() => navigate("/teacher/courses/create")}
          addLabel="Create Course"
        />

        <div className="p-4">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : paginatedData.length === 0 ? (
            <EmptyState
              title="No courses found"
              description="Try adjusting your search or filters, or create your first course."
              icon={BookOpen}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedData.map((course) => (
                <CourseCard key={course.id} course={course} onDelete={() => setDeleteTarget(course)} />
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

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete course"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will also remove its assignments.`}
        confirmLabel="Delete"
      />
    </div>
  );
}