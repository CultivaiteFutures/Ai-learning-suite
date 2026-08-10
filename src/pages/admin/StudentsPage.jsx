import { useState, useEffect, useMemo } from "react";
import { GraduationCap, UserCheck, UserX, Pencil, Trash2 } from "lucide-react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import DataTable from "../../components/table/DataTable";
import TableToolbar from "../../components/table/TableToolbar";
import Pagination from "../../components/table/Pagination";
import StatusBadge from "../../components/common/StatusBadge";
import ConfirmationDialog from "../../components/common/ConfirmationDialog";
import StudentFormModal from "../../components/admin/StudentFormModal";
import { useDataTable } from "../../hooks/useDataTable";
import mockStudents from "../../data/mockStudents.json";
import mockGrades from "../../data/mockGrades.json";
import { generateId } from "../../utils/generateId";

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStudents(mockStudents);
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const gradeOptions = useMemo(
    () => [{ value: "all", label: "All Grades" }, ...mockGrades.map((g) => ({ value: g.name, label: g.name }))],
    []
  );

  const {
    paginatedData, searchTerm, setSearchTerm, filters, setFilter,
    sortConfig, handleSort, currentPage, setCurrentPage, totalPages, pageSize, totalItems,
  } = useDataTable({
    data: students,
    searchFields: ["name", "email", "guardianName"],
    defaultSort: { key: "name", direction: "asc" },
  });

  const stats = useMemo(() => ({
    total: students.length,
    active: students.filter((s) => s.status === "active").length,
    inactive: students.filter((s) => s.status === "inactive").length,
  }), [students]);

  function openCreate() {
    setEditingStudent(null);
    setFormOpen(true);
  }

  function openEdit(student) {
    setEditingStudent(student);
    setFormOpen(true);
  }

  function handleSave(data) {
    if (editingStudent) {
      setStudents((prev) => prev.map((s) => (s.id === editingStudent.id ? { ...s, ...data } : s)));
    } else {
      setStudents((prev) => [{ id: generateId(), ...data }, ...prev]);
    }
    setFormOpen(false);
  }

  function confirmDelete() {
    setDeleting(true);
    setTimeout(() => {
      setStudents((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleting(false);
      setDeleteTarget(null);
    }, 500);
  }

  const columns = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-500">{row.email}</p>
        </div>
      ),
    },
    { key: "grade", label: "Grade", sortable: true },
    { key: "section", label: "Section", sortable: true, render: (row) => `Section ${row.section}` },
    { key: "guardianName", label: "Guardian", sortable: true },
    { key: "enrollmentDate", label: "Enrolled", sortable: true },
    { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEdit(row)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600">
            <Pencil size={15} />
          </button>
          <button onClick={() => setDeleteTarget(row)} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Students</h1>
        <p className="mt-1 text-sm text-slate-500">Manage student enrollment across all grade levels.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashboardCard label="Total Students" value={stats.total} icon={GraduationCap} accent="indigo" />
        <DashboardCard label="Active" value={stats.active} icon={UserCheck} accent="emerald" />
        <DashboardCard label="Inactive" value={stats.inactive} icon={UserX} accent="rose" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <TableToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search students by name, email, guardian..."
          filters={[
            { key: "grade", value: filters.grade || "all", onChange: (v) => setFilter("grade", v), options: gradeOptions },
            {
              key: "status",
              value: filters.status || "all",
              onChange: (v) => setFilter("status", v),
              options: [
                { value: "all", label: "All Status" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ],
            },
          ]}
          onAddClick={openCreate}
          addLabel="Add Student"
        />

        <DataTable
          columns={columns}
          data={paginatedData}
          loading={loading}
          keyExtractor={(row) => row.id}
          sortConfig={sortConfig}
          onSort={handleSort}
          emptyTitle="No students found"
          emptyDescription="Try adjusting your search or filters, or add a new student."
        />

        {!loading && totalItems > 0 && (
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={totalItems} pageSize={pageSize} />
        )}
      </div>

      <StudentFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} onSave={handleSave} initialData={editingStudent} />

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Remove student"
        message={`Are you sure you want to remove ${deleteTarget?.name}? This action cannot be undone.`}
        confirmLabel="Remove"
      />
    </div>
  );
}