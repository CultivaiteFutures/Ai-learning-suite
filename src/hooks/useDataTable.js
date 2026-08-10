import { useState, useMemo } from "react";

/**
 * Shared logic for search + filter + sort + pagination
 * used by every Data Table page (Teachers, Students, Grades).
 */
export function useDataTable({ data, searchFields = [], defaultSort = null, pageSize: initialPageSize = 8 }) {
  const [searchTerm, setSearchTermState] = useState("");
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState(defaultSort);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  function setSearchTerm(value) {
    setSearchTermState(value);
    setCurrentPage(1);
  }

  function setFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }

  function clearFilters() {
    setFilters({});
    setSearchTermState("");
    setCurrentPage(1);
  }

  function handleSort(key) {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  }

  const filteredData = useMemo(() => {
    let result = [...data];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((item) =>
        searchFields.some((field) => String(item[field] ?? "").toLowerCase().includes(term))
      );
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all") {
        result = result.filter((item) => String(item[key]) === String(value));
      }
    });

    if (sortConfig?.key) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, filters, sortConfig, searchFields]);

  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, safePage, pageSize]);

  return {
    paginatedData,
    searchTerm,
    setSearchTerm,
    filters,
    setFilter,
    clearFilters,
    sortConfig,
    handleSort,
    currentPage: safePage,
    setCurrentPage,
    totalPages,
    pageSize,
    setPageSize,
    totalItems,
  };
}