import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ currentPage, totalPages, onPageChange, totalItems, pageSize }) {
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  function getPageNumbers() {
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  }

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row">
      <p className="text-sm text-slate-500">
        Showing <span className="font-medium text-slate-700">{start}</span>–
        <span className="font-medium text-slate-700">{end}</span> of{" "}
        <span className="font-medium text-slate-700">{totalItems}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={16} />
        </button>
        {getPageNumbers().map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium ${
              page === currentPage ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}