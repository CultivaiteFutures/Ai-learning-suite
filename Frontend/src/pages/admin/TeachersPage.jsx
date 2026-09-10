import { useState, useEffect, useMemo } from "react";
import { Users, UserCheck, UserX, Pencil, Trash2, KeyRound, Upload, Download } from "lucide-react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import DataTable from "../../components/table/DataTable";
import TableToolbar from "../../components/table/TableToolbar";
import Pagination from "../../components/table/Pagination";
import StatusBadge from "../../components/common/StatusBadge";
import ConfirmationDialog from "../../components/common/ConfirmationDialog";
import TeacherFormModal from "../../components/admin/TeacherFormModal";
import TeacherCsvUploadModal from "../../components/admin/TeacherCsvUploadModal";
import CredentialsRevealModal from "../../components/admin/CredentialsRevealModal";
import { useDataTable } from "../../hooks/useDataTable";
import { schoolAdminAPI } from "../../services/api";

export default function TeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [resetError, setResetError] = useState("");
  const [csvUploadOpen, setCsvUploadOpen] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  function handleResetPassword(row) {
    setResetError("");
    schoolAdminAPI
      .resetPassword(row.id)
      .then((res) => {
        setCredentials({
          role: "Teacher",
          name: row.name || row.full_name,
          email: row.email,
          tempPassword: res.data.generatedPassword,
        });
      })
      .catch((err) => setResetError(err.response?.data?.detail || "Could not reset this teacher's password."));
  }

  function loadTeachers() {
    setLoading(true);
    schoolAdminAPI.getTeachers().then((res) => {
      if (res.data && Array.isArray(res.data)) {
        setTeachers(res.data);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }

  useEffect(() => {
    loadTeachers();
  }, []);

  async function handleExportCsv() {
    setExportingCsv(true);
    try {
      const res = await schoolAdminAPI.exportRosterCsv("teacher");
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "teacher_roster.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setResetError("Failed to export the teacher roster.");
    } finally {
      setExportingCsv(false);
    }
  }

  const subjectOptions = useMemo(() => {
    const subjects = Array.from(new Set(teachers.map((t) => t.subject).filter(Boolean)));
    return [{ value: "all", label: "All Subjects" }, ...subjects.map((s) => ({ value: s, label: s }))];
  }, [teachers]);

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
    active: teachers.filter((t) => t.status === "active" || t.isActive !== false).length,
    inactive: teachers.filter((t) => t.status === "inactive" || t.isActive === false).length,
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
      schoolAdminAPI.updateTeacher(editingTeacher.id, data).catch(() => {});
      setTeachers((prev) => prev.map((t) => (t.id === editingTeacher.id ? { ...t, ...data } : t)));
    } else {
      // Password is only sent if the admin actually typed one -- when omitted,
      // the backend generates a secure credential itself and returns it below.
      const payload = {
        full_name: data.name,
        email: data.email,
        subject: data.subject || "General",
      };
      if (data.password && data.password.trim()) {
        payload.password = data.password.trim();
      }
      schoolAdminAPI.createTeacher(payload).then((res) => {
        const created = res.data;
        setTeachers((prev) => [{ id: created.id, name: created.name || created.full_name, email: created.email, subject: created.subject || "General", status: "active" }, ...prev]);
        if (created.generatedPassword) {
          setCredentials({ role: "Teacher", name: created.name || created.full_name, email: created.email, tempPassword: created.generatedPassword });
        }
      }).catch(() => {
        setTeachers((prev) => [{ id: Date.now().toString(), status: "active", ...data }, ...prev]);
      });
    }
    setFormOpen(false);
  }

  function confirmDelete() {
    setDeleting(true);
    schoolAdminAPI.deleteTeacher(deleteTarget.id).catch(() => {});
    setTeachers((prev) => prev.filter((t) => t.id !== deleteTarget.id));
    setDeleting(false);
    setDeleteTarget(null);
  }

  const columns = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.name || row.full_name}</p>
          <p className="text-xs text-slate-500">{row.email}</p>
        </div>
      ),
    },
    { key: "subject", label: "Subject", sortable: true, render: (row) => row.subject || "General" },
    { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status || (row.isActive ? "active" : "inactive")} /> },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => handleResetPassword(row)} className="rounded-md p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600" title="Reset password">
            <KeyRound size={15} />
          </button>
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Teachers</h1>
          <p className="mt-1 text-sm text-slate-500">Manage teacher accounts across your school, and bulk import/export via CSV.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCsvUploadOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <Upload size={15} className="text-indigo-600" />
            Upload CSV
          </button>
          <button
            onClick={handleExportCsv}
            disabled={exportingCsv}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm disabled:opacity-50"
          >
            <Download size={15} className="text-emerald-600" />
            {exportingCsv ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>

      {resetError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{resetError}</div>
      )}

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
      <CredentialsRevealModal isOpen={!!credentials} onClose={() => setCredentials(null)} credentials={credentials} />
      <TeacherCsvUploadModal
        isOpen={csvUploadOpen}
        onClose={() => setCsvUploadOpen(false)}
        onUploadSuccess={() => loadTeachers()}
      />

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