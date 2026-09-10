import { useState, useMemo } from "react";
import { Building2, CheckCircle2, XCircle } from "lucide-react";
import PlatformStatCard from "../../components/superadmin/PlatformStatCard";
import SchoolTable from "../../components/superadmin/SchoolTable";
import SchoolFormModal from "../../components/superadmin/SchoolFormModal";
import OnboardingWizardModal from "../../components/superadmin/OnboardingWizardModal";
import CredentialsRevealModal from "../../components/superadmin/CredentialsRevealModal";
import TableToolbar from "../../components/table/TableToolbar";
import Pagination from "../../components/table/Pagination";
import ConfirmationDialog from "../../components/common/ConfirmationDialog";
import { useSchools } from "../../context/SchoolContext";
import { useDataTable } from "../../hooks/useDataTable";

export default function SchoolsPage() {
  const { schools, addSchool, updateSchool, suspendSchool, activateSchool, deleteSchool } = useSchools();

  const [formOpen, setFormOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [credentials, setCredentials] = useState(null);

  const {
    paginatedData, searchTerm, setSearchTerm, filters, setFilter,
    sortConfig, handleSort, currentPage, setCurrentPage, totalPages, pageSize, totalItems,
  } = useDataTable({
    data: schools,
    searchFields: ["schoolName", "schoolCode", "email", "principalName"],
    defaultSort: { key: "schoolName", direction: "asc" },
  });

  const stats = useMemo(() => ({
    total: schools.length,
    active: schools.filter((s) => s.status === "active").length,
    inactive: schools.filter((s) => s.status !== "active").length,
  }), [schools]);

  function openCreate() {
    setEditingSchool(null);
    setWizardOpen(true);
  }

  function openEdit(school) {
    setEditingSchool(school);
    setFormOpen(true);
  }

  async function handleSave(data) {
    if (editingSchool) {
      await updateSchool(editingSchool.id, data);
      setFormOpen(false);
    } else {
      const { school, admin } = await addSchool(data);
      setWizardOpen(false);
      setCredentials({ school, admin });
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    await deleteSchool(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Schools</h1>
        <p className="mt-1 text-sm text-slate-500">Onboard and manage every school on the platform.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <PlatformStatCard label="Total Schools" value={stats.total} icon={Building2} accent="indigo" />
        <PlatformStatCard label="Active" value={stats.active} icon={CheckCircle2} accent="emerald" />
        <PlatformStatCard label="Inactive" value={stats.inactive} icon={XCircle} accent="rose" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <TableToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search schools by name, code, email..."
          filters={[
            {
              key: "status", value: filters.status || "all", onChange: (v) => setFilter("status", v),
              options: [
                { value: "all", label: "All Status" },
                { value: "active", label: "Active" },
                { value: "suspended", label: "Suspended" },
                { value: "pending", label: "Pending" },
              ],
            },
            {
              key: "subscriptionPlan", value: filters.subscriptionPlan || "all", onChange: (v) => setFilter("subscriptionPlan", v),
              options: [
                { value: "all", label: "All Plans" },
                { value: "Trial", label: "Trial" },
                { value: "Basic", label: "Basic" },
                { value: "Professional", label: "Professional" },
                { value: "Premium", label: "Premium" },
                { value: "Enterprise", label: "Enterprise" },
              ],
            },
          ]}
          onAddClick={openCreate}
          addLabel="Onboard School"
        />

        <SchoolTable
          schools={paginatedData}
          loading={false}
          sortConfig={sortConfig}
          onSort={handleSort}
          onEdit={openEdit}
          onSuspend={(row) => suspendSchool(row.id)}
          onActivate={(row) => activateSchool(row.id)}
          onDelete={setDeleteTarget}
        />

        {totalItems > 0 && (
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={totalItems} pageSize={pageSize} />
        )}
      </div>

      <SchoolFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} onSave={handleSave} initialData={editingSchool} />
      <OnboardingWizardModal isOpen={wizardOpen} onClose={() => setWizardOpen(false)} onSave={handleSave} />

      <CredentialsRevealModal
        isOpen={!!credentials}
        onClose={() => setCredentials(null)}
        school={credentials?.school}
        admin={credentials?.admin}
      />

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete school"
        message={`Are you sure you want to permanently delete "${deleteTarget?.schoolName}"? This removes its subscription and admin account too.`}
        confirmLabel="Delete"
      />
    </div>
  );
}