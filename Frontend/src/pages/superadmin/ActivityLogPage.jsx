import { useState, useEffect, useMemo } from "react";
import { Activity, Download } from "lucide-react";
import DataTable from "../../components/table/DataTable";
import TableToolbar from "../../components/table/TableToolbar";
import Pagination from "../../components/table/Pagination";
import PlatformStatCard from "../../components/superadmin/PlatformStatCard";
import { useSchools } from "../../context/SchoolContext";
import { useDataTable } from "../../hooks/useDataTable";
import { superAdminAPI } from "../../services/api";

// The ActivityLog model is returned as a plain SQLAlchemy row (no response_model),
// so its literal attribute names -- snake_case -- are what ships over the wire.
function normalizeLog(a) {
  return {
    id: a.id,
    schoolId: a.school_id ?? a.schoolId ?? null,
    type: a.action ?? a.type ?? "activity",
    message: a.details ?? a.message ?? "",
    userName: a.user_name ?? a.userName ?? null,
    timestamp: a.timestamp ?? a.created_at ?? a.createdAt ?? null,
  };
}

export default function ActivityLogPage() {
  const { schools } = useSchools();
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  function loadLogs() {
    setLoading(true);
    setError("");
    superAdminAPI
      .getActivityLogs()
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data.map(normalizeLog) : [];
        setActivityLogs(rows);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.detail || "Failed to load activity logs.");
        setLoading(false);
      });
  }

  useEffect(() => {
    loadLogs();
  }, []);

  async function handleExportCsv() {
    setExporting(true);
    try {
      const res = await superAdminAPI.exportActivityLogsCsv();
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "platform_activity_logs.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to export activity logs.");
    } finally {
      setExporting(false);
    }
  }

  const enriched = useMemo(
    () => activityLogs.map((a) => ({ ...a, schoolName: schools.find((s) => s.id === a.schoolId)?.schoolName || "Platform" })),
    [activityLogs, schools]
  );

  const {
    paginatedData, searchTerm, setSearchTerm, filters, setFilter,
    sortConfig, handleSort, currentPage, setCurrentPage, totalPages, pageSize, totalItems,
  } = useDataTable({
    data: enriched,
    searchFields: ["message", "schoolName", "type"],
    defaultSort: { key: "timestamp", direction: "desc" },
  });

  const typeOptions = useMemo(() => {
    const types = Array.from(new Set(activityLogs.map((a) => a.type)));
    return [{ value: "all", label: "All Types" }, ...types.map((t) => ({ value: t, label: t.replace(/_/g, " ") }))];
  }, [activityLogs]);

  const columns = [
    { key: "timestamp", label: "Time", sortable: true, render: (row) => (row.timestamp ? new Date(row.timestamp).toLocaleString() : "—") },
    { key: "schoolName", label: "School", sortable: true },
    { key: "type", label: "Type", render: (row) => <span className="capitalize">{row.type.replace(/_/g, " ")}</span> },
    { key: "message", label: "Details" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Activity Logs</h1>
          <p className="mt-1 text-sm text-slate-500">Platform-wide audit trail across every school -- account changes, deletions, and login activity.</p>
        </div>
        <button
          onClick={handleExportCsv}
          disabled={exporting}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm disabled:opacity-50"
        >
          <Download size={15} className="text-emerald-600" />
          {exporting ? "Exporting..." : "Export CSV"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <PlatformStatCard label="Total Events" value={activityLogs.length} icon={Activity} accent="indigo" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <TableToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search activity..."
          filters={[{ key: "type", value: filters.type || "all", onChange: (v) => setFilter("type", v), options: typeOptions }]}
        />
        {error ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium text-rose-600">{error}</p>
            <button
              onClick={loadLogs}
              className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <DataTable columns={columns} data={paginatedData} loading={loading} keyExtractor={(row) => row.id} sortConfig={sortConfig} onSort={handleSort} emptyTitle="No activity yet" emptyDescription="Platform activity will appear here as schools, admins, and teachers take action." />
            {!loading && totalItems > 0 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={totalItems} pageSize={pageSize} />}
          </>
        )}
      </div>
    </div>
  );
}
