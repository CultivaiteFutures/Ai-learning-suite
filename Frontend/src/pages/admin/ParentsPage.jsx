import { useState, useEffect, useMemo } from "react";
import { Users, UserCheck, UserX, Pencil, Trash2, Baby, KeyRound } from "lucide-react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import DataTable from "../../components/table/DataTable";
import TableToolbar from "../../components/table/TableToolbar";
import Pagination from "../../components/table/Pagination";
import StatusBadge from "../../components/common/StatusBadge";
import ConfirmationDialog from "../../components/common/ConfirmationDialog";
import ParentFormModal from "../../components/admin/ParentFormModal";
import CredentialsRevealModal from "../../components/admin/CredentialsRevealModal";
import { useDataTable } from "../../hooks/useDataTable";
import { schoolAdminAPI } from "../../services/api";

export default function ParentsPage() {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingParent, setEditingParent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [saveError, setSaveError] = useState("");
  const [resetError, setResetError] = useState("");

  function handleResetPassword(row) {
    setResetError("");
    schoolAdminAPI
      .resetPassword(row.id)
      .then((res) => {
        setCredentials({
          role: "Parent",
          name: row.name || row.fullName,
          email: row.email,
          tempPassword: res.data.generatedPassword,
        });
      })
      .catch((err) => setResetError(err.response?.data?.detail || "Could not reset this parent's password."));
  }

  function loadData() {
    setLoading(true);
    schoolAdminAPI
      .getParents()
      .then((res) => {
        setParents(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  const {
    paginatedData, searchTerm, setSearchTerm,
    sortConfig, handleSort, currentPage, setCurrentPage, totalPages, pageSize, totalItems,
  } = useDataTable({
    data: parents,
    searchFields: ["name", "email"],
    defaultSort: { key: "name", direction: "asc" },
  });

  const stats = useMemo(() => ({
    total: parents.length,
    active: parents.filter((p) => p.isActive !== false).length,
    inactive: parents.filter((p) => p.isActive === false).length,
    linkedChildren: parents.reduce((sum, p) => sum + (p.children?.length || 0), 0),
  }), [parents]);

  function openCreate() {
    setEditingParent(null);
    setSaveError("");
    setFormOpen(true);
  }

  function openEdit(parent) {
    setEditingParent(parent);
    setSaveError("");
    setFormOpen(true);
  }

  function handleSave(data) {
    setSaveError("");
    if (editingParent) {
      schoolAdminAPI
        .updateParent(editingParent.id, {
          full_name: data.name,
          email: data.email,
          student_ids: data.studentIds,
        })
        .then(() => {
          setFormOpen(false);
          loadData();
        })
        .catch((err) => {
          setSaveError(err.response?.data?.detail || "Failed to update this parent.");
        });
    } else {
      const payload = {
        full_name: data.name,
        email: data.email,
        student_ids: data.studentIds,
      };
      if (data.password && data.password.trim()) {
        payload.password = data.password.trim();
      }
      schoolAdminAPI
        .createParent(payload)
        .then((res) => {
          const created = res.data;
          setFormOpen(false);
          loadData();
          if (created.generatedPassword) {
            setCredentials({
              role: "Parent",
              name: created.name || created.fullName,
              email: created.email,
              tempPassword: created.generatedPassword,
            });
          }
        })
        .catch((err) => {
          setSaveError(err.response?.data?.detail || "Failed to create this parent account.");
        });
    }
  }

  function confirmDelete() {
    setDeleting(true);
    schoolAdminAPI
      .deleteParent(deleteTarget.id)
      .then(() => {
        setDeleting(false);
        setDeleteTarget(null);
        loadData();
      })
      .catch(() => {
        setDeleting(false);
        setDeleteTarget(null);
      });
  }

  const columns = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.name || row.fullName}</p>
          <p className="text-xs text-slate-500">{row.email}</p>
        </div>
      ),
    },
    {
      key: "children",
      label: "Linked Children",
      render: (row) =>
        row.children && row.children.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.children.map((c) => (
              <span key={c.id} className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                {c.name}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-slate-400">No children linked</span>
        ),
    },
    { key: "status", label: "Status", render: (row) => <StatusBadge status={row.isActive === false ? "inactive" : "active"} /> },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => handleResetPassword(row)} className="rounded-md p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600" title="Reset password">
            <KeyRound size={15} />
          </button>
          <button onClick={() => openEdit(row)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600">
            <Pencil size={15} />
          </button>
          <button onClick={() => setDeleteTarget(row)} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Parents / Guardians</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create parent accounts and link them to their children so families can view grades and progress.
        </p>
      </div>

      {resetError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{resetError}</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <DashboardCard label="Total Parents" value={stats.total} icon={Users} accent="indigo" />
        <DashboardCard label="Active" value={stats.active} icon={UserCheck} accent="emerald" />
        <DashboardCard label="Inactive" value={stats.inactive} icon={UserX} accent="rose" />
        <DashboardCard label="Linked Children" value={stats.linkedChildren} icon={Baby} accent="amber" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <TableToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search parents by name or email..."
          onAddClick={openCreate}
          addLabel="Add Parent"
        />

        <DataTable
          columns={columns}
          data={paginatedData}
          loading={loading}
          keyExtractor={(row) => row.id}
          sortConfig={sortConfig}
          onSort={handleSort}
          emptyTitle="No parents found"
          emptyDescription="Add a parent account and link it to one or more students so families can see grades and progress."
        />

        {!loading && totalItems > 0 && (
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={totalItems} pageSize={pageSize} />
        )}
      </div>

      <ParentFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        initialData={editingParent}
        serverError={saveError}
      />
      <CredentialsRevealModal isOpen={!!credentials} onClose={() => setCredentials(null)} credentials={credentials} />

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Remove parent"
        message={`Are you sure you want to remove ${deleteTarget?.name}? This will unlink them from any children and cannot be undone.`}
        confirmLabel="Remove"
      />
    </div>
  );
}
