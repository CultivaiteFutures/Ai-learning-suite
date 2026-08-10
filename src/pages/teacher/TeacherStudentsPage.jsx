import { useState, useEffect, useMemo } from "react";
import { Users, TrendingUp, CalendarCheck } from "lucide-react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import DataTable from "../../components/table/DataTable";
import TableToolbar from "../../components/table/TableToolbar";
import Pagination from "../../components/table/Pagination";
import { useDataTable } from "../../hooks/useDataTable";
import mockTeacherStudents from "../../data/mockTeacherStudents.json";

export default function TeacherStudentsPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const courseOptions = useMemo(() => {
    const names = Array.from(new Set(mockTeacherStudents.map((s) => s.course)));
    return [{ value: "all", label: "All Courses" }, ...names.map((n) => ({ value: n, label: n }))];
  }, []);

  const {
    paginatedData,
    searchTerm,
    setSearchTerm,
    filters,
    setFilter,
    sortConfig,
    handleSort,
    currentPage,
    setCurrentPage,
    totalPages,
    pageSize,
    totalItems,
  } = useDataTable({
    data: mockTeacherStudents,
    searchFields: ["name", "email", "course"],
    defaultSort: { key: "name", direction: "asc" },
  });

  const stats = useMemo(() => {
    const avgGrade = Math.round(mockTeacherStudents.reduce((s, x) => s + x.averageGrade, 0) / mockTeacherStudents.length);
    const avgAttendance = Math.round(mockTeacherStudents.reduce((s, x) => s + x.attendance, 0) / mockTeacherStudents.length);
    return { total: mockTeacherStudents.length, avgGrade, avgAttendance };
  }, []);

  const columns = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-500">{row.email}</p>
        </div>
      ),
    },
    { key: "course", label: "Course", sortable: true },
    { key: "grade", label: "Grade", sortable: true },
    { key: "section", label: "Section", render: (row) => `Section ${row.section}` },
    { key: "averageGrade", label: "Avg. Grade", sortable: true, render: (row) => `${row.averageGrade}%` },
    { key: "attendance", label: "Attendance", sortable: true, render: (row) => `${row.attendance}%` },
    { key: "lastActive", label: "Last Active", sortable: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Students</h1>
        <p className="mt-1 text-sm text-slate-500">Students enrolled across the courses you teach.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashboardCard label="Total Students" value={stats.total} icon={Users} accent="indigo" />
        <DashboardCard label="Avg. Grade" value={`${stats.avgGrade}%`} icon={TrendingUp} accent="emerald" />
        <DashboardCard label="Avg. Attendance" value={`${stats.avgAttendance}%`} icon={CalendarCheck} accent="amber" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <TableToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search students by name, email, course..."
          filters={[{ key: "course", value: filters.course || "all", onChange: (v) => setFilter("course", v), options: courseOptions }]}
        />

        <DataTable
          columns={columns}
          data={paginatedData}
          loading={loading}
          keyExtractor={(row) => row.id}
          sortConfig={sortConfig}
          onSort={handleSort}
          emptyTitle="No students found"
          emptyDescription="Try adjusting your search or filters."
        />

        {!loading && totalItems > 0 && (
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