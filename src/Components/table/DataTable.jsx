import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import LoadingState from "../common/LoadingState";
import EmptyState from "../common/EmptyState";

export default function DataTable({
  columns,
  data,
  loading,
  keyExtractor,
  sortConfig,
  onSort,
  emptyTitle,
  emptyDescription,
  emptyIcon,
}) {
  if (loading) return <LoadingState rows={6} columns={columns.length} />;
  if (!data || data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} icon={emptyIcon} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-y border-slate-200 bg-slate-50">
            {columns.map((col) => (
              <th key={col.key} className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-500">
                {col.sortable ? (
                  <button
                    onClick={() => onSort(col.key)}
                    className="flex items-center gap-1 hover:text-slate-800"
                  >
                    {col.label}
                    {sortConfig?.key === col.key ? (
                      sortConfig.direction === "asc" ? (
                        <ChevronUp size={13} />
                      ) : (
                        <ChevronDown size={13} />
                      )
                    ) : (
                      <ChevronsUpDown size={13} className="text-slate-300" />
                    )}
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={keyExtractor(row)} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-slate-700">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}