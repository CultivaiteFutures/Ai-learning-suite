import { Link } from "react-router-dom";
import { Eye, Pencil, Ban, CheckCircle2, Trash2 } from "lucide-react";
import DataTable from "../table/DataTable";
import SchoolStatusBadge from "./SchoolStatusBadge";
import SubscriptionBadge from "./SubscriptionBadge";

export default function SchoolTable({ schools, loading, sortConfig, onSort, onEdit, onSuspend, onActivate, onDelete }) {
  const columns = [
    {
      key: "schoolName",
      label: "School",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.schoolName}</p>
          <p className="text-xs text-slate-500">{row.schoolCode}</p>
        </div>
      ),
    },
    { key: "city", label: "Location", sortable: true, render: (row) => [row.city, row.state].filter(Boolean).join(", ") || "—" },
    { key: "subscriptionPlan", label: "Plan", sortable: true, render: (row) => <SubscriptionBadge plan={row.subscriptionPlan} /> },
    { key: "studentCount", label: "Students", sortable: true },
    { key: "teacherCount", label: "Teachers", sortable: true },
    { key: "status", label: "Status", render: (row) => <SchoolStatusBadge status={row.status} /> },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Link to={`/super-admin/schools/${row.id}`} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600">
            <Eye size={15} />
          </Link>
          <button onClick={() => onEdit(row)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600">
            <Pencil size={15} />
          </button>
          {row.status === "active" ? (
            <button onClick={() => onSuspend(row)} className="rounded-md p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600">
              <Ban size={15} />
            </button>
          ) : (
            <button onClick={() => onActivate(row)} className="rounded-md p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600">
              <CheckCircle2 size={15} />
            </button>
          )}
          <button onClick={() => onDelete(row)} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={schools}
      loading={loading}
      keyExtractor={(row) => row.id}
      sortConfig={sortConfig}
      onSort={onSort}
      emptyTitle="No schools found"
      emptyDescription="Try adjusting your search or filters, or onboard a new school."
    />
  );
}