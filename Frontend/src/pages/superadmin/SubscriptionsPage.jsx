import { useState, useMemo } from "react";
import { CreditCard, CheckCircle2, XCircle } from "lucide-react";
import PlatformStatCard from "../../components/superadmin/PlatformStatCard";
import SubscriptionBadge from "../../components/superadmin/SubscriptionBadge";
import DataTable from "../../components/table/DataTable";
import TableToolbar from "../../components/table/TableToolbar";
import Pagination from "../../components/table/Pagination";
import Modal from "../../components/ui/Modal";
import SelectField from "../../components/ui/SelectField";
import InputField from "../../components/ui/InputField";
import PrimaryButton from "../../components/ui/PrimaryButton";
import { useSchools } from "../../context/SchoolContext";
import { useDataTable } from "../../hooks/useDataTable";

const PLAN_OPTIONS = ["Trial", "Basic", "Professional", "Premium", "Enterprise"].map((p) => ({ value: p, label: p }));
const STATUS_OPTIONS = [
  { value: "active", label: "Active" }, { value: "expired", label: "Expired" }, { value: "cancelled", label: "Cancelled" },
];

export default function SubscriptionsPage() {
  const { subscriptions, schools, updateSubscription } = useSchools();
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const enriched = useMemo(
    () => subscriptions.map((s) => ({ ...s, schoolName: schools.find((sc) => sc.id === s.schoolId)?.schoolName || "Unknown" })),
    [subscriptions, schools]
  );

  const {
    paginatedData, searchTerm, setSearchTerm, filters, setFilter,
    sortConfig, handleSort, currentPage, setCurrentPage, totalPages, pageSize, totalItems,
  } = useDataTable({
    data: enriched,
    searchFields: ["schoolName", "plan"],
    defaultSort: { key: "expiryDate", direction: "asc" },
  });

  const stats = useMemo(() => ({
    total: subscriptions.length,
    active: subscriptions.filter((s) => s.status === "active").length,
    expired: subscriptions.filter((s) => s.status !== "active").length,
  }), [subscriptions]);

  function openChangePlan(row) {
    setEditing(row);
    setSaveError("");
    setFormData({
      plan: row.plan,
      status: row.status,
      expiryDate: row.expiryDate || "",
      renewalDate: row.renewalDate || "",
      studentLimit: row.studentLimit != null ? String(row.studentLimit) : "",
      teacherLimit: row.teacherLimit != null ? String(row.teacherLimit) : "",
    });
  }

  function handleFieldChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    try {
      await updateSubscription(editing.schoolId, { plan: formData.plan, status: formData.status });
      setSaving(false);
      setEditing(null);
    } catch (err) {
      setSaving(false);
      setSaveError(err?.response?.data?.detail || "Failed to update subscription. Please try again.");
    }
  }

  const columns = [
    { key: "schoolName", label: "School", sortable: true },
    { key: "plan", label: "Plan", sortable: true, render: (row) => <SubscriptionBadge plan={row.plan} /> },
    { key: "status", label: "Status", sortable: true },
    { key: "expiryDate", label: "Expiry", sortable: true },
    { key: "renewalDate", label: "Renewal", sortable: true },
    { key: "studentLimit", label: "Student Limit" },
    { key: "teacherLimit", label: "Teacher Limit" },
    {
      key: "actions", label: "",
      render: (row) => (
        <button onClick={() => openChangePlan(row)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
          Change Plan
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Subscriptions</h1>
        <p className="mt-1 text-sm text-slate-500">Manage every school's subscription plan and limits.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <PlatformStatCard label="Total Subscriptions" value={stats.total} icon={CreditCard} accent="indigo" />
        <PlatformStatCard label="Active" value={stats.active} icon={CheckCircle2} accent="emerald" />
        <PlatformStatCard label="Expired / Cancelled" value={stats.expired} icon={XCircle} accent="rose" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <TableToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search by school or plan..."
          filters={[
            { key: "plan", value: filters.plan || "all", onChange: (v) => setFilter("plan", v), options: [{ value: "all", label: "All Plans" }, ...PLAN_OPTIONS] },
            { key: "status", value: filters.status || "all", onChange: (v) => setFilter("status", v), options: [{ value: "all", label: "All Status" }, ...STATUS_OPTIONS] },
          ]}
        />
        <DataTable columns={columns} data={paginatedData} loading={false} keyExtractor={(row) => row.id} sortConfig={sortConfig} onSort={handleSort} emptyTitle="No subscriptions found" />
        {totalItems > 0 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={totalItems} pageSize={pageSize} />}
      </div>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={`Change Plan — ${editing?.schoolName || ""}`} maxWidth="max-w-md">
        {formData && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Plan" name="plan" value={formData.plan} onChange={handleFieldChange} options={PLAN_OPTIONS} />
              <SelectField label="Status" name="status" value={formData.status} onChange={handleFieldChange} options={STATUS_OPTIONS} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Expiry Date" name="expiryDate" type="date" value={formData.expiryDate} onChange={handleFieldChange} />
              <InputField label="Renewal Date" name="renewalDate" type="date" value={formData.renewalDate} onChange={handleFieldChange} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Student Limit" name="studentLimit" type="number" value={formData.studentLimit} onChange={handleFieldChange} />
              <InputField label="Teacher Limit" name="teacherLimit" type="number" value={formData.teacherLimit} onChange={handleFieldChange} />
            </div>
            {saveError && (
              <p className="text-sm text-rose-600">{saveError}</p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setEditing(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <div className="w-32"><PrimaryButton onClick={handleSave} loading={saving}>Save</PrimaryButton></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}