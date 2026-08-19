import { useMemo } from "react";
import { Activity } from "lucide-react";
import DataTable from "../../components/table/DataTable";
import TableToolbar from "../../components/table/TableToolbar";
import Pagination from "../../components/table/Pagination";
import PlatformStatCard from "../../components/superadmin/PlatformStatCard";
import { useSchools } from "../../context/SchoolContext";
import { useDataTable } from "../../hooks/useDataTable";

export default function ActivityLogPage() {
  const { activityLogs, schools } = useSchools();

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
    { key: "timestamp", label: "Time", sortable: true, render: (row) => new Date(row.timestamp).toLocaleString() },
    { key: "schoolName", label: "School", sortable: true },
    { key: "type", label: "Type", render: (row) => <span className="capitalize">{row.type.replace(/_/g, " ")}</span> },
    { key: "message", label: "Details" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Activity Logs</h1>
        <p className="mt-1 text-sm text-slate-500">Platform-wide audit trail across every school.</p>
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
        <DataTable columns={columns} data={paginatedData} loading={false} keyExtractor={(row) => row.id} sortConfig={sortConfig} onSort={handleSort} emptyTitle="No activity yet" />
        {totalItems > 0 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={totalItems} pageSize={pageSize} />}
      </div>
    </div>
  );
}