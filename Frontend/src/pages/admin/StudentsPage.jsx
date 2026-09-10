import { useState, useEffect, useMemo } from "react";
import { GraduationCap, UserCheck, UserX, Pencil, Trash2, FileSpreadsheet, Plus, KeyRound, Download, Loader2, FileDown } from "lucide-react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import DataTable from "../../components/table/DataTable";
import TableToolbar from "../../components/table/TableToolbar";
import Pagination from "../../components/table/Pagination";
import StatusBadge from "../../components/common/StatusBadge";
import ConfirmationDialog from "../../components/common/ConfirmationDialog";
import StudentFormModal from "../../components/admin/StudentFormModal";
import StudentExcelUploadModal from "../../components/admin/StudentExcelUploadModal";
import CredentialsRevealModal from "../../components/admin/CredentialsRevealModal";
import { useDataTable } from "../../hooks/useDataTable";
import { schoolAdminAPI } from "../../services/api";

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [resetError, setResetError] = useState("");
  const [reportCardLoadingId, setReportCardLoadingId] = useState(null);
  const [reportCardError, setReportCardError] = useState("");
  const [exportingCsv, setExportingCsv] = useState(false);

  function handleResetPassword(row) {
    setResetError("");
    schoolAdminAPI
      .resetPassword(row.id)
      .then((res) => {
        setCredentials({
          role: "Student",
          name: row.name || row.full_name,
          email: row.email,
          tempPassword: res.data.generatedPassword,
        });
      })
      .catch((err) => setResetError(err.response?.data?.detail || "Could not reset this student's password."));
  }

  function loadData() {
    setLoading(true);
    Promise.all([
      schoolAdminAPI.getStudents().catch(() => ({ data: [] })),
      schoolAdminAPI.getGrades().catch(() => ({ data: [] })),
    ]).then(([resS, resG]) => {
      if (resS.data && Array.isArray(resS.data)) setStudents(resS.data);
      if (resG.data && Array.isArray(resG.data)) setGrades(resG.data);
      setLoading(false);
    });
  }

  useEffect(() => {
    loadData();
  }, []);

  const gradeOptions = useMemo(
    () => [{ value: "all", label: "All Grades" }, ...grades.map((g) => ({ value: g.name, label: g.name }))],
    [grades]
  );

  const {
    paginatedData, searchTerm, setSearchTerm, filters, setFilter,
    sortConfig, handleSort, currentPage, setCurrentPage, totalPages, pageSize, totalItems,
  } = useDataTable({
    data: students,
    searchFields: ["name", "email", "section"],
    defaultSort: { key: "name", direction: "asc" },
  });

  const stats = useMemo(() => ({
    total: students.length,
    active: students.filter((s) => s.status === "active" || s.isActive !== false).length,
    inactive: students.filter((s) => s.status === "inactive" || s.isActive === false).length,
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
      schoolAdminAPI.updateStudent(editingStudent.id, data).catch(() => {});
      setStudents((prev) => prev.map((s) => (s.id === editingStudent.id ? { ...s, ...data } : s)));
    } else {
      // Password is only sent if the admin actually typed one -- when omitted,
      // the backend generates a secure credential itself and returns it below.
      const payload = {
        full_name: data.name,
        email: data.email,
        grade_id: data.gradeId,
        section: data.section || "A",
      };
      if (data.password && data.password.trim()) {
        payload.password = data.password.trim();
      }
      schoolAdminAPI.createStudent(payload).then((res) => {
        const created = res.data;
        setStudents((prev) => [{ id: created.id, name: created.name || created.full_name, email: created.email, grade: created.grade || "Grade 10", section: created.section || "A", status: "active" }, ...prev]);
        if (created.generatedPassword) {
          setCredentials({ role: "Student", name: created.name || created.full_name, email: created.email, tempPassword: created.generatedPassword });
        }
      }).catch(() => {
        setStudents((prev) => [{ id: Date.now().toString(), status: "active", section: "A", ...data }, ...prev]);
      });
    }
    setFormOpen(false);
  }

  function confirmDelete() {
    setDeleting(true);
    schoolAdminAPI.deleteStudent(deleteTarget.id).catch(() => {});
    setStudents((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    setDeleting(false);
    setDeleteTarget(null);
  }

  function downloadBlob(data, mimeType, filename) {
    const blob = new Blob([data], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  async function handleExportCsv() {
    setExportingCsv(true);
    try {
      const res = await schoolAdminAPI.exportRosterCsv("student");
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "student_roster.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setReportCardError("Failed to export the student roster.");
    } finally {
      setExportingCsv(false);
    }
  }

  async function handleDownloadReportCard(row) {
    setReportCardError("");
    setReportCardLoadingId(row.id);
    try {
      const res = await schoolAdminAPI.getStudentReportCard(row.id);
      const name = (row.name || row.full_name || "student").replace(/\s+/g, "_");
      downloadBlob(res.data, "application/pdf", `report_card_${name}.pdf`);
    } catch (err) {
      setReportCardError("Failed to generate this student's report card.");
    } finally {
      setReportCardLoadingId(null);
    }
  }

  const [dataExportLoadingId, setDataExportLoadingId] = useState(null);

  async function handleExportData(row) {
    setDataExportLoadingId(row.id);
    try {
      const res = await schoolAdminAPI.exportStudentData(row.id);
      const name = (row.name || row.full_name || "student").replace(/\s+/g, "_");
      downloadBlob(res.data, "application/json", `${name}_data_export.json`);
    } catch (err) {
      setReportCardError("Failed to export this student's data.");
    } finally {
      setDataExportLoadingId(null);
    }
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
    { key: "grade", label: "Grade", sortable: true, render: (row) => row.grade || row.grade_level || "N/A" },
    { key: "section", label: "Section", sortable: true, render: (row) => row.section || "A" },
    { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status || (row.isActive ? "active" : "inactive")} /> },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => handleDownloadReportCard(row)}
            disabled={reportCardLoadingId === row.id}
            className="rounded-md p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50"
            title="Download report card"
          >
            {reportCardLoadingId === row.id ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          </button>
          <button
            onClick={() => handleExportData(row)}
            disabled={dataExportLoadingId === row.id}
            className="rounded-md p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50"
            title="Export all data (privacy request)"
          >
            {dataExportLoadingId === row.id ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
          </button>
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
          <h1 className="text-2xl font-semibold text-slate-900">Students</h1>
          <p className="mt-1 text-sm text-slate-500">Manage student enrollment, bulk Excel import, and credentials.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={exportingCsv}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm disabled:opacity-50"
          >
            <Download size={15} className="text-emerald-600" />
            {exportingCsv ? "Exporting..." : "Export CSV"}
          </button>
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            Upload Excel (.xlsx)
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm"
          >
            <Plus size={15} />
            Add Student Manually
          </button>
        </div>
      </div>

      {resetError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{resetError}</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashboardCard label="Total Students" value={stats.total} icon={GraduationCap} accent="indigo" />
        <DashboardCard label="Active" value={stats.active} icon={UserCheck} accent="emerald" />
        <DashboardCard label="Inactive" value={stats.inactive} icon={UserX} accent="rose" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <TableToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search students by name, email..."
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
      <StudentExcelUploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} onUploadSuccess={loadData} />
      <CredentialsRevealModal isOpen={!!credentials} onClose={() => setCredentials(null)} credentials={credentials} />

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