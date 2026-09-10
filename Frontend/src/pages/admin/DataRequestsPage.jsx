import { useState, useEffect } from "react";
import { ShieldAlert, Trash2, XCircle, Loader2, CheckCircle2 } from "lucide-react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import ConfirmationDialog from "../../components/common/ConfirmationDialog";
import { schoolAdminAPI } from "../../services/api";

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700",
  fulfilled: "bg-rose-50 text-rose-700",
  dismissed: "bg-slate-100 text-slate-500",
};

/**
 * Task #61: the School Admin's queue for student/parent-submitted account
 * deletion requests. Fulfilling one actually erases the student (same
 * hard-delete path as the Students page's own delete button); dismissing
 * one just closes it out without touching the account.
 */
export default function DataRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null); // { id, studentName } for fulfill confirmation

  function loadRequests() {
    setLoading(true);
    setError("");
    schoolAdminAPI
      .getDataRequests()
      .then((res) => setRequests(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError("Failed to load data requests."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function handleFulfill(id) {
    setActingId(id);
    try {
      await schoolAdminAPI.fulfillDataRequest(id);
      setConfirmTarget(null);
      loadRequests();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to fulfill this request.");
    } finally {
      setActingId(null);
    }
  }

  async function handleDismiss(id) {
    setActingId(id);
    try {
      await schoolAdminAPI.dismissDataRequest(id);
      loadRequests();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to dismiss this request.");
    } finally {
      setActingId(null);
    }
  }

  const pending = requests.filter((r) => r.status === "pending");
  const resolved = requests.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Data Requests</h1>
        <p className="mt-1 text-sm text-slate-500">
          Account deletion requests submitted by students or their parents. Fulfilling one permanently erases the
          student's account and data.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashboardCard label="Pending" value={pending.length} icon={ShieldAlert} accent="amber" />
        <DashboardCard label="Fulfilled" value={requests.filter((r) => r.status === "fulfilled").length} icon={Trash2} accent="rose" />
        <DashboardCard label="Dismissed" value={requests.filter((r) => r.status === "dismissed").length} icon={XCircle} />
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <LoadingState rows={4} columns={1} />
        ) : requests.length === 0 ? (
          <EmptyState
            title="No data requests"
            description="When a student or parent requests account deletion, it will show up here for your review."
            icon={ShieldAlert}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {[...pending, ...resolved].map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{r.student_name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLES[r.status] || "bg-slate-100 text-slate-500"}`}>
                      {r.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Requested by {(r.requested_by_role || "").toLowerCase() || "unknown"} ·{" "}
                    {r.requested_at ? new Date(r.requested_at).toLocaleString() : "—"}
                  </p>
                  {r.note && <p className="mt-1 text-xs italic text-slate-500">"{r.note}"</p>}
                </div>

                {r.status === "pending" ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDismiss(r.id)}
                      disabled={actingId === r.id}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmTarget({ id: r.id, studentName: r.student_name })}
                      disabled={actingId === r.id}
                      className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      {actingId === r.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      Fulfill (Erase)
                    </button>
                  </div>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <CheckCircle2 size={13} /> Resolved {r.resolved_at ? new Date(r.resolved_at).toLocaleDateString() : ""}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        title="Permanently erase this student?"
        message={confirmTarget ? `This will permanently delete ${confirmTarget.studentName}'s account and all associated data (grades, submissions, messages, attendance). This cannot be undone.` : ""}
        confirmLabel="Erase permanently"
        tone="danger"
        loading={actingId === confirmTarget?.id}
        onConfirm={() => confirmTarget && handleFulfill(confirmTarget.id)}
      />
    </div>
  );
}
