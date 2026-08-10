import { useState, useEffect, useMemo } from "react";
import { BookOpen, Users, Layers, Pencil, Trash2 } from "lucide-react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import DataTable from "../../components/table/DataTable";
import TableToolbar from "../../components/table/TableToolbar";
import Pagination from "../../components/table/Pagination";
import ConfirmationDialog from "../../components/common/ConfirmationDialog";
import GradeFormModal from "../../components/admin/GradeFormModal";
import { useDataTable } from "../../hooks/useDataTable";
import mockGrades from "../../data/mockGrades.json";
import { generateId } from "../../utils/generateId";

export default function GradesPage() {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setGrades(mockGrades);
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const {
    paginatedData, searchTerm, setSearchTerm,
    sortConfig, handleSort, currentPage, setCurrentPage, totalPages, pageSize, totalItems,
  } = useDataTable({
    data: grades,
    searchFields: ["name"],
    defaultSort: { key: "name", direction: "asc" },
    pageSize: 8,
  });

  const stats = useMemo(() => ({
    totalGrades: grades.length,
    totalStudents: grades.reduce((sum, g) => sum + g.studentsCount, 0),
    totalSections: grades.reduce((sum, g) => sum + g.sections, 0),
  }), [grades]);

  function openCreate() {
    setEditingGrade(null);
    setFormOpen(true);
  }

  function openEdit(grade) {
    setEditingGrade(grade);
    setFormOpen(true);
  }

  function handleSave(data) {
    if (editingGrade) {
      setGrades((prev) => prev.map((g) => (g.id === editingGrade.id ? { ...g, ...data } : g)));
    } else {
      setGrades((prev) => [{ id: generateId(), studentsCount: 0, teachersCount: 0, averagePerformance: 0, ...data }, ...prev]);
    }
    setFormOpen(false);
  }

  function confirmDelete() {
    setDeleting(true);
    setTimeout(() => {
      setGrades((prev) => prev.filter((g) => g.id !== deleteTarget.id));
      setDeleting(false);
      setDeleteTarget(null);
    }, 500);
  }

  const columns = [
    { key: "name", label: "Grade Level", sortable: true },
    { key: "sections", label: "Sections", sortable: true },
    { key: "studentsCount", label: "Students", sortable: true },
    { key: "teachersCount", label: "Teachers", sortable: true },
    { key: "averagePerformance", label: "Avg. Performance", sortable: true, render: (row) => `${row.averagePerformance}%` },
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
        <h1 className="text-2xl font-semibold text-slate-900">Grades</h1>
        <p className="mt-1 text-sm text-slate-500">Manage grade levels, sections, and academic performance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashboardCard label="Grade Levels" value={stats.totalGrades} icon={BookOpen} accent="indigo" />
        <DashboardCard label="Total Students" value={stats.totalStudents} icon={Users} accent="emerald" />
        <DashboardCard label="Total Sections" value={stats.totalSections} icon={Layers} accent="amber" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <TableToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search grade levels..."
          onAddClick={openCreate}
          addLabel="Add Grade"
        />

        <DataTable
          columns={columns}
          data={paginatedData}
          loading={loading}
          keyExtractor={(row) => row.id}
          sortConfig={sortConfig}
          onSort={handleSort}
          emptyTitle="No grade levels found"
          emptyDescription="Add a grade level to get started."
        />

        {!loading && totalItems > 0 && (
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={totalItems} pageSize={pageSize} />
        )}
      </div>

      <GradeFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} onSave={handleSave} initialData={editingGrade} />

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete grade level"
        message={`Are you sure you want to delete ${deleteTarget?.name}? This will not remove enrolled students.`}
        confirmLabel="Delete"
      />
    </div>
  );
}