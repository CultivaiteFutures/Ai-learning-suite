import { useState, useEffect } from "react";
import { FileSpreadsheet, FileText, Loader2, Users, BookOpen, ClipboardCheck, Clock } from "lucide-react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import DataTable from "../../components/table/DataTable";
import TableToolbar from "../../components/table/TableToolbar";
import Pagination from "../../components/table/Pagination";
import { useDataTable } from "../../hooks/useDataTable";
import { teacherAPI } from "../../services/api";

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

export default function TeacherReportsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");

  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  const [exporting, setExporting] = useState({ excel: false, pdf: false });
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    teacherAPI
      .getAnalytics()
      .then((res) => {
        setAnalytics(res.data || null);
        setAnalyticsLoading(false);
      })
      .catch((err) => {
        setAnalyticsError(err.response?.data?.detail || "Failed to load report summary.");
        setAnalyticsLoading(false);
      });

    teacherAPI
      .getStudents()
      .then((res) => {
        if (res.data && Array.isArray(res.data)) setStudents(res.data);
        setStudentsLoading(false);
      })
      .catch(() => setStudentsLoading(false));
  }, []);

  const {
    paginatedData,
    searchTerm,
    setSearchTerm,
    sortConfig,
    handleSort,
    currentPage,
    setCurrentPage,
    totalPages,
    pageSize,
    totalItems,
  } = useDataTable({
    data: students,
    searchFields: ["name", "email"],
    defaultSort: { key: "name", direction: "asc" },
  });

  async function handleExportExcel() {
    setExportError("");
    setExporting((prev) => ({ ...prev, excel: true }));
    try {
      const res = await teacherAPI.exportGradesExcel();
      downloadBlob(
        res.data,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "gradebook_report.xlsx"
      );
    } catch (err) {
      setExportError(err.response?.data?.detail || "Failed to export the gradebook as Excel. Please try again.");
    } finally {
      setExporting((prev) => ({ ...prev, excel: false }));
    }
  }

  async function handleExportPDF() {
    setExportError("");
    setExporting((prev) => ({ ...prev, pdf: true }));
    try {
      const res = await teacherAPI.exportGradesPDF();
      downloadBlob(res.data, "application/pdf", "gradebook_report.pdf");
    } catch (err) {
      setExportError(err.response?.data?.detail || "Failed to export the gradebook as PDF. Please try again.");
    } finally {
      setExporting((prev) => ({ ...prev, pdf: false }));
    }
  }

  const columns = [
    {
      key: "name",
      label: "Student",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-500">{row.email}</p>
        </div>
      ),
    },
    { key: "grade", label: "Grade", sortable: true, render: (row) => row.grade || "N/A" },
    { key: "enrolledCourses", label: "Enrolled Courses", sortable: true, render: (row) => row.enrolledCourses ?? 0 },
    { key: "xp", label: "XP", sortable: true, render: (row) => `${row.xp || 0} XP` },
    { key: "streak", label: "Streak", sortable: true, render: (row) => `${row.streak || 0} days` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">Gradebook export and a real snapshot of your classes.</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={exporting.excel}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting.excel ? (
                <Loader2 size={15} className="animate-spin text-emerald-600" />
              ) : (
                <FileSpreadsheet size={15} className="text-emerald-600" />
              )}
              {exporting.excel ? "Exporting..." : "Export Gradebook (Excel)"}
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exporting.pdf}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting.pdf ? (
                <Loader2 size={15} className="animate-spin text-rose-600" />
              ) : (
                <FileText size={15} className="text-rose-600" />
              )}
              {exporting.pdf ? "Exporting..." : "Export Gradebook (PDF)"}
            </button>
          </div>
          {exportError && <p className="text-xs font-medium text-rose-600">{exportError}</p>}
        </div>
      </div>

      {analyticsError && <p className="text-sm font-medium text-rose-600">{analyticsError}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          label="Total Courses"
          value={analyticsLoading ? "…" : analytics?.totalCourses ?? 0}
          icon={BookOpen}
          accent="indigo"
        />
        <DashboardCard
          label="Total Students"
          value={analyticsLoading ? "…" : analytics?.totalStudents ?? 0}
          icon={Users}
          accent="indigo"
        />
        <DashboardCard
          label="Submissions Received"
          value={analyticsLoading ? "…" : analytics?.submissionsCount ?? 0}
          icon={ClipboardCheck}
          accent="emerald"
        />
        <DashboardCard
          label="Avg. Lesson Completion"
          value={analyticsLoading ? "…" : `${analytics?.averageCompletionRate ?? 0}%`}
          icon={Clock}
          accent="emerald"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Student Summary</h2>
          <p className="mt-0.5 text-xs text-slate-500">Real per-student enrollment, XP and streak data for your school.</p>
        </div>
        <TableToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search students by name, email..."
        />
        <DataTable
          columns={columns}
          data={paginatedData}
          loading={studentsLoading}
          keyExtractor={(row) => row.id}
          sortConfig={sortConfig}
          onSort={handleSort}
          emptyTitle="No students found"
          emptyDescription="Students will appear here once they join your courses."
        />
        {!studentsLoading && totalItems > 0 && (
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
