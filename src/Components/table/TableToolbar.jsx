import { Search, Plus, SlidersHorizontal } from "lucide-react";

export default function TableToolbar({
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  onAddClick,
  addLabel = "Add New",
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {filters.map((filter) => (
          <div key={filter.key} className="flex items-center gap-1.5">
            <SlidersHorizontal size={14} className="hidden text-slate-400 sm:block" />
            <select
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {onAddClick && (
        <button
          onClick={onAddClick}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Plus size={16} />
          {addLabel}
        </button>
      )}
    </div>
  );
}