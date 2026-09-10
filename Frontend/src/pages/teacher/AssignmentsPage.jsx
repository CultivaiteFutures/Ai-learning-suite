import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Clock, CheckCircle2, Pencil, Trash2, ClipboardCheck } from "lucide-react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import DataTable from "../../components/table/DataTable";
import TableToolbar from "../../components/table/TableToolbar";
import Pagination from "../../components/table/Pagination";
import StatusBadge from "../../components/common/StatusBadge";
import ConfirmationDialog from "../../components/common/ConfirmationDialog";
import AssignmentFormModal from "../../components/teacher/AssignmentFormModal";
import { useCourses } from "../../context/CourseContext";
import { useDataTable } from "../../hooks/useDataTable";

export default function AssignmentsPage() {
  const navigate = useNavigate();
  const { courses, assignments, addAssignment, updateAssignment, deleteAssignment } = useCourses();
  const [formOpen, setFormOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const courseNameById = useMemo(() => {
    const map = {};
    courses.forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [courses]);

  const enrichedAssignments = useMemo(
    () => assignments.map((a) => ({ ...a, courseName: courseNameById[a.courseId] || "Unknown Course" })),
    [assignments, courseNameById]
  );

  const courseOptions = useMemo(
    () => [{ value: "all", label: "All Courses" }, ...courses.map((c) => ({ value: c.id, label: c.name }))],
    [courses]
  );

  const {
    paginatedData,
    searchTerm,
    setSearchTerm,
    filters,
    setFilter,
    sortConfig,
    handleSort,
    currentPage,
    setCurrentPage,
    totalPages,
    pageSize,
    totalItems,
  } = useDataTable({
    data: enrichedAssignments,
    searchFields: ["title", "courseName"],
    defaultSort: { key: "dueDate", direction: "asc" },
  });

  const stats = useMemo(
    () => ({
      total: assignments.length,
      open: assignments.filter((a) => a.status === "open").length,
      grading: assignments.filter((a) => a.status === "grading").length,
    }),
    [assignments]
  );

  function openCreate() {
    setEditingAssignment(null);
    setFormOpen(true);
  }

  function openEdit(assignment) {
    setEditingAssignment(assignment);
    setFormOpen(true);
  }

  function handleSave(data) {
    const result = editingAssignment
      ? updateAssignment(editingAssignment.id, data)
      : addAssignment(data);
    setFormOpen(false);
    return result;
  }

  function confirmDelete() {
    deleteAssignment(deleteTarget.id);
    setDeleteTarget(null);
  }

  const columns = [
    { key: "title", label: "Title", sortable: true },
    { key: "courseName", label: "Course", sortable: true },
    { key: "type", label: "Type" },
    { key: "dueDate", label: "Due Date", sortable: true },
    {
      key: "submissionsCount",
      label: "Submissions",
      // Neither field is returned by GET /teacher/assignments today (no per-assignment
      // submission aggregation exists yet) -- show an honest placeholder instead of the
      // literal "undefined/undefined" that resulted from formatting two missing values.
      render: (row) =>
        row.submissionsCount != null && row.totalStudents != null
          ? `${row.submissionsCount}/${row.totalStudents}`
          : "—",
    },
    { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => navigate(`/teacher/assignments/${row.id}/submissions`)}
            title="View Submissions"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
          >
            <ClipboardCheck size={15} />
          </button>
          <button
            onClick={() => openEdit(row)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => setDeleteTarget(row)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Assignments</h1>
        <p className="mt-1 text-sm text-slate-500">Track and manage assignments across all your courses.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashboardCard label="Total Assignments" value={stats.total} icon={ClipboardList} accent="indigo" />
        <DashboardCard label="Open" value={stats.open} icon={Clock} accent="amber" />
        <DashboardCard label="In Grading" value={stats.grading} icon={CheckCircle2} accent="emerald" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <TableToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search assignments by title or course..."
          filters={[
            { key: "courseId", value: filters.courseId || "all", onChange: (v) => setFilter("courseId", v), options: courseOptions },
            {
              key: "status",
              value: filters.status || "all",
              onChange: (v) => setFilter("status", v),
              options: [
                { value: "all", label: "All Status" },
                { value: "open", label: "Open" },
                { value: "grading", label: "Grading" },
                { value: "closed", label: "Closed" },
              ],
            },
          ]}
          onAddClick={openCreate}
          addLabel="Add Assignment"
        />

        <DataTable
          columns={columns}
          data={paginatedData}
          loading={false}
          keyExtractor={(row) => row.id}
          sortConfig={sortConfig}
          onSort={handleSort}
          emptyTitle="No assignments found"
          emptyDescription="Try adjusting your search or filters, or create a new assignment."
        />

        {totalItems > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={totalItems}
            pageSize={pageSize}
          />
        )}
      </div>

      <AssignmentFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        initialData={editingAssignment}
        lockCourseId={null}
      />

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete assignment"
        message={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        confirmLabel="Delete"
      />
    </div>
  );
}