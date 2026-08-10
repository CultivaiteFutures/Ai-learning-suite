import { useState, useEffect, useMemo } from "react";
import { Users, UserCheck, UserX, Pencil, Trash2 } from "lucide-react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import DataTable from "../../components/table/DataTable";
import TableToolbar from "../../components/table/TableToolbar";
import Pagination from "../../components/table/Pagination";
import StatusBadge from "../../components/common/StatusBadge";
import ConfirmationDialog from "../../components/common/ConfirmationDialog";
import TeacherFormModal from "../../components/admin/TeacherFormModal";
import { useDataTable } from "../../hooks/useDataTable";
import mockTeachers from "../../data/mockTeachers.json";
import { generateId } from "../../utils/generateId";

export default function TeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTeachers(mockTeachers);
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const subjectOptions = useMemo(() => {
    const subjects = Array.from(new Set(mockTeachers.map((t) => t.subject)));
    return [{ value: "all", label: "All Subjects" }, ...subjects.map((s) => ({ value: s, label: s }))];
  }, []);

  const {
    paginatedData, searchTerm, setSearchTerm, filters, setFilter,
    sortConfig, handleSort, currentPage, setCurrentPage, totalPages, pageSize, totalItems,
  } = useDataTable({
    data: teachers,
    searchFields: ["name", "email", "subject"],
    defaultSort: { key: "name", direction: "asc" },
  });

  const stats = useMemo(() => ({
    total: teachers.length,
    active: teachers.filter((t) => t.status === "active").length,
    inactive: teachers.filter((t) => t.status === "inactive").length,
  }), [teachers]);

  function openCreate() {
    setEditingTeacher(null);
    setFormOpen(true);
  }

  function openEdit(teacher) {
    setEditingTeacher(teacher);
    setFormOpen(true);
  }

  function handleSave(data) {
    if (editingTeacher) {
      setTeachers((prev) => prev.map((t) => (t.id === editingTeacher.id ? { ...t, ...data } : t)));
    } else {
      setTeachers((prev) => [{ id: generateId(), ...data }, ...prev]);
    }
    setFormOpen(false);
  }

  function confirmDelete() {
    setDeleting(true);
    setTimeout(() => {
      setTeachers((prev) => prev.filter((t) => t.id !== deleteTarget.id));
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
    { key: "subject", label: "Subject", sortable: true },
    { key: "gradeLevel", label: "Grade Level", sortable: true },
    { key: "joinedDate", label: "Joined", sortable: true },
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
        <h1 className="text-2xl font-semibold text-slate-900">Teachers</h1>
        <p className="mt-1 text-sm text-slate-500">Manage teacher accounts across your school.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashboardCard label="Total Teachers" value={stats.total} icon={Users} accent="indigo" />
        <DashboardCard label="Active" value={stats.active} icon={UserCheck} accent="emerald" />
        <DashboardCard label="Inactive" value={stats.inactive} icon={UserX} accent="rose" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <TableToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search teachers by name, email, subject..."
          filters={[
            { key: "subject", value: filters.subject || "all", onChange: (v) => setFilter("subject", v), options: subjectOptions },
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
          addLabel="Add Teacher"
        />

        <DataTable
          columns={columns}
          data={paginatedData}
          loading={loading}
          keyExtractor={(row) => row.id}
          sortConfig={sortConfig}
          onSort={handleSort}
          emptyTitle="No teachers found"
          emptyDescription="Try adjusting your search or filters, or add a new teacher."
        />

        {!loading && totalItems > 0 && (
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={totalItems} pageSize={pageSize} />
        )}
      </div>

      <TeacherFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} onSave={handleSave} initialData={editingTeacher} />

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Remove teacher"
        message={`Are you sure you want to remove ${deleteTarget?.name}? This action cannot be undone.`}
        confirmLabel="Remove"
      />
    </div>
  );
}