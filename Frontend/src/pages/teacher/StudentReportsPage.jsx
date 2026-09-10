import { useState, useEffect } from "react";
import { FileSpreadsheet, FileText, Loader2, Users, Download } from "lucide-react";
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

// Merged replacement for the old separate "Students" and "Reports" teacher
// tabs -- one place to see every student across this teacher's own courses
// (name, grade, XP/points, streak, and how many of the teacher's courses
// they're enrolled in), plus the real gradebook export that used to live on
// the Reports tab alone.
export default function StudentReportsPage() {
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState("");

  const [exporting, setExporting] = useState({ excel: false, pdf: false });
  const [reportCardLoadingId, setReportCardLoadingId] = useState(null);
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    teacherAPI
      .getStudents()
      .then((res) => {
        setStudents(Array.isArray(res.data) ? res.data : []);
        setStudentsLoading(false);
      })
      .catch((err) => {
        setStudentsError(err.response?.data?.detail || "Failed to load your students.");
        setStudentsLoading(false);
      });
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

  async function handleDownloadReportCard(student) {
    setExportError("");
    setReportCardLoadingId(student.id);
    try {
      const res = await teacherAPI.getStudentReportCard(student.id);
      downloadBlob(res.data, "application/pdf", `report_card_${(student.name || "student").replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      setExportError(err.response?.data?.detail || "Failed to generate this student's report card.");
    } finally {
      setReportCardLoadingId(null);
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
    { key: "xp", label: "Points (XP)", sortable: true, render: (row) => `${row.xp || 0} XP` },
    { key: "streak", label: "Streak", sortable: true, render: (row) => `${row.streak || 0} days` },
    {
      key: "reportCard",
      label: "Report Card",
      render: (row) => (
        <button
          type="button"
          onClick={() => handleDownloadReportCard(row)}
          disabled={reportCardLoadingId === row.id}
          className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
        >
          {reportCardLoadingId === row.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          PDF
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Student Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Every student across your own courses -- points, streak, and enrollment, plus gradebook export.
          </p>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashboardCard label="Total Students" value={students.length} icon={Users} accent="indigo" />
      </div>

      {studentsError && <p className="text-sm font-medium text-rose-600">{studentsError}</p>}

      <div className="rounded-xl border border-slate-200 bg-white">
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
          emptyDescription="Students will appear here once they join one of your courses."
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
