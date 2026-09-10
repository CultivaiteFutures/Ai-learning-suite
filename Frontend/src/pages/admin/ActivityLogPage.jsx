import { useState, useEffect, useMemo } from "react";
import { Activity } from "lucide-react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import DataTable from "../../components/table/DataTable";
import TableToolbar from "../../components/table/TableToolbar";
import Pagination from "../../components/table/Pagination";
import { useDataTable } from "../../hooks/useDataTable";
import { schoolAdminAPI } from "../../services/api";

// GET /school-admin/activity-logs returns the ActivityLog rows as plain
// SQLAlchemy objects (no response_model), so the wire shape is whatever
// FastAPI's default jsonable_encoder produces for the ORM instance's own
// (snake_case) attribute names.
function normalizeLog(a) {
  return {
    id: a.id,
    type: a.action ?? a.type ?? "activity",
    message: a.details ?? a.message ?? "",
    userName: a.user_name ?? a.userName ?? null,
    timestamp: a.timestamp ?? a.created_at ?? a.createdAt ?? null,
  };
}

/**
 * School-scoped audit trail -- who on your staff changed what. Every
 * account-creation and password-reset action already writes an ActivityLog
 * row scoped to this school (see app/api/v1/school_admin.py); this page is
 * the first place any of that becomes visible to a School Admin, rather
 * than only existing at the Super Admin's platform-wide layer.
 */
export default function ActivityLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function loadLogs() {
    setLoading(true);
    setError("");
    schoolAdminAPI
      .getActivityLogs()
      .then((res) => {
        setLogs(Array.isArray(res.data) ? res.data.map(normalizeLog) : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.detail || "Failed to load your school's activity log.");
        setLoading(false);
      });
  }

  useEffect(() => {
    loadLogs();
  }, []);

  const {
    paginatedData, searchTerm, setSearchTerm, filters, setFilter,
    sortConfig, handleSort, currentPage, setCurrentPage, totalPages, pageSize, totalItems,
  } = useDataTable({
    data: logs,
    searchFields: ["message", "type", "userName"],
    defaultSort: { key: "timestamp", direction: "desc" },
  });

  const typeOptions = useMemo(() => {
    const types = Array.from(new Set(logs.map((l) => l.type)));
    return [{ value: "all", label: "All Types" }, ...types.map((t) => ({ value: t, label: t.replace(/_/g, " ") }))];
  }, [logs]);

  const columns = [
    { key: "timestamp", label: "Time", sortable: true, render: (row) => (row.timestamp ? new Date(row.timestamp).toLocaleString() : "—") },
    { key: "type", label: "Action", render: (row) => <span className="capitalize">{row.type.replace(/_/g, " ")}</span> },
    { key: "userName", label: "By", render: (row) => row.userName || "—" },
    { key: "message", label: "Details" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Activity Log</h1>
        <p className="mt-1 text-sm text-slate-500">Who on your staff created, changed, or reset what -- scoped to your school.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashboardCard label="Total Events" value={logs.length} icon={Activity} accent="indigo" />
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
            <DataTable
              columns={columns}
              data={paginatedData}
              loading={loading}
              keyExtractor={(row) => row.id}
              sortConfig={sortConfig}
              onSort={handleSort}
              emptyTitle="No activity yet"
              emptyDescription="Actions your staff take -- creating accounts, resetting passwords, and more -- will show up here."
            />
            {!loading && totalItems > 0 && (
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={totalItems} pageSize={pageSize} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
