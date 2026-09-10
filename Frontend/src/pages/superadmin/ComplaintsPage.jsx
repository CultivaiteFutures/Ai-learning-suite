import { useEffect, useState } from "react";
import { MessageSquareWarning, Clock, CheckCircle2, Loader2 } from "lucide-react";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import { superAdminAPI } from "../../services/api";

const STATUS_STYLES = {
  OPEN: "bg-amber-50 text-amber-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  RESOLVED: "bg-emerald-50 text-emerald-700",
};

const STATUS_LABELS = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
};

const FILTERS = ["ALL", "OPEN", "IN_PROGRESS", "RESOLVED"];

/**
 * Task #66: the Super Admin's queue for every complaint/support ticket a
 * School Admin has submitted across every school (see admin/ComplaintsPage.jsx
 * on the submitting side).
 */
export default function SuperAdminComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [draftNotes, setDraftNotes] = useState({});
  const [savingId, setSavingId] = useState(null);

  function loadComplaints() {
    setLoading(true);
    setError("");
    superAdminAPI
      .getComplaints(filter === "ALL" ? undefined : filter)
      .then((res) => setComplaints(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError("Failed to load complaints."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadComplaints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function handleStatusChange(id, status) {
    setSavingId(id);
    try {
      await superAdminAPI.updateComplaint(id, { status, resolutionNote: draftNotes[id] });
      loadComplaints();
    } catch {
      setError("Failed to update this complaint.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleSaveNote(id) {
    setSavingId(id);
    try {
      await superAdminAPI.updateComplaint(id, { resolutionNote: draftNotes[id] });
      loadComplaints();
    } catch {
      setError("Failed to save the note.");
    } finally {
      setSavingId(null);
    }
  }

  const openCount = complaints.filter((c) => c.status === "OPEN").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Complaints</h1>
        <p className="mt-1 text-sm text-slate-500">
          Support tickets submitted by School Admins across every school{openCount > 0 ? ` — ${openCount} open` : ""}.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              filter === f ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {f === "ALL" ? "All" : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {loading ? (
        <LoadingState />
      ) : complaints.length === 0 ? (
        <EmptyState
          icon={MessageSquareWarning}
          title="No complaints"
          description="Nothing has been submitted by a School Admin yet."
        />
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{c.schoolName || "Unknown school"}</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">{c.subject}</p>
                  <p className="mt-1 text-sm text-slate-600">{c.description}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Submitted by {c.submittedByName || "a School Admin"} · <Clock size={11} className="mb-0.5 inline" />{" "}
                    {c.createdAt ? new Date(c.createdAt).toLocaleString() : "—"}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[c.status] || "bg-slate-100 text-slate-500"}`}>
                  {STATUS_LABELS[c.status] || c.status}
                </span>
              </div>

              <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                <textarea
                  value={draftNotes[c.id] ?? c.resolutionNote ?? ""}
                  onChange={(e) => setDraftNotes((prev) => ({ ...prev, [c.id]: e.target.value }))}
                  rows={2}
                  placeholder="Add a note or resolution for this complaint..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleSaveNote(c.id)}
                    disabled={savingId === c.id}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Save Note
                  </button>
                  {c.status !== "IN_PROGRESS" && (
                    <button
                      onClick={() => handleStatusChange(c.id, "IN_PROGRESS")}
                      disabled={savingId === c.id}
                      className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                    >
                      Mark In Progress
                    </button>
                  )}
                  {c.status !== "RESOLVED" && (
                    <button
                      onClick={() => handleStatusChange(c.id, "RESOLVED")}
                      disabled={savingId === c.id}
                      className="flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                    >
                      {savingId === c.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                      Mark Resolved
                    </button>
                  )}
                  {c.status !== "OPEN" && (
                    <button
                      onClick={() => handleStatusChange(c.id, "OPEN")}
                      disabled={savingId === c.id}
                      className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-60"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
