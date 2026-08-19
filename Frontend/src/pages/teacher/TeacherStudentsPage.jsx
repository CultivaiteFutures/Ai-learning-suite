import { useState, useEffect, useMemo } from "react";
import { Users, TrendingUp, CalendarCheck } from "lucide-react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import DataTable from "../../components/table/DataTable";
import TableToolbar from "../../components/table/TableToolbar";
import Pagination from "../../components/table/Pagination";
import { useDataTable } from "../../hooks/useDataTable";
import { teacherAPI } from "../../services/api";

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    teacherAPI.getStudents().then((res) => {
      if (res.data && Array.isArray(res.data)) {
        setStudents(res.data);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const courseOptions = useMemo(() => {
    const names = Array.from(new Set(students.map((s) => s.grade || s.course).filter(Boolean)));
    return [{ value: "all", label: "All Grades" }, ...names.map((n) => ({ value: n, label: n }))];
  }, [students]);

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
    data: students,
    searchFields: ["name", "email"],
    defaultSort: { key: "name", direction: "asc" },
  });

  const stats = useMemo(() => {
    return { total: students.length };
  }, [students]);

  const columns = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.name || row.full_name}</p>
          <p className="text-xs text-slate-500">{row.email}</p>
        </div>
      ),
    },
    { key: "grade", label: "Grade", sortable: true, render: (row) => row.grade || row.grade_level || "N/A" },
    { key: "xp", label: "XP", sortable: true, render: (row) => `${row.xp || 0} XP` },
    { key: "streak", label: "Streak", sortable: true, render: (row) => `${row.streak || 0} days` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Students</h1>
        <p className="mt-1 text-sm text-slate-500">Students enrolled in your school.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashboardCard label="Total Students" value={stats.total} icon={Users} accent="indigo" />
        <DashboardCard label="Active Roster" value={stats.total} icon={TrendingUp} accent="emerald" />
        <DashboardCard label="Enrolled Status" value="Active" icon={CalendarCheck} accent="amber" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <TableToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search students by name, email..."
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
          emptyDescription="Students will appear here once they join your school or courses."
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