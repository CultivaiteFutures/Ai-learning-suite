import { useEffect, useState } from "react";
import { MessageSquareWarning, Send, Clock, CheckCircle2, Loader2 } from "lucide-react";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import { schoolAdminAPI } from "../../services/api";

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

/**
 * Task #66: lets a School Admin raise a complaint/support ticket that goes
 * straight to the Super Admin's queue (see superadmin/ComplaintsPage.jsx),
 * and see the status/resolution note of everything they've submitted.
 */
export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function loadComplaints() {
    setLoading(true);
    schoolAdminAPI
      .getComplaints()
      .then((res) => setComplaints(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError("Failed to load your complaints."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadComplaints();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!subject.trim() || !description.trim()) {
      setError("Please fill in both the subject and description.");
      return;
    }
    setSubmitting(true);
    try {
      await schoolAdminAPI.createComplaint({ subject: subject.trim(), description: description.trim() });
      setSubject("");
      setDescription("");
      setSuccess("Your complaint has been sent to the Super Admin.");
      loadComplaints();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to submit your complaint. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Complaints &amp; Support</h1>
        <p className="mt-1 text-sm text-slate-500">
          Raise an issue or request with the Super Admin and track its status here.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <MessageSquareWarning size={16} className="text-indigo-600" /> New Complaint
        </h2>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of the issue"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe what's happening, when it started, and any steps you've already tried."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs">
              {error && <span className="text-red-600">{error}</span>}
              {!error && success && <span className="text-emerald-600">{success}</span>}
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              {submitting ? "Sending..." : "Send to Super Admin"}
            </button>
          </div>
        </div>
      </form>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Your Complaints</h2>
        {loading ? (
          <LoadingState />
        ) : complaints.length === 0 ? (
          <EmptyState title="No complaints yet" description="Anything you send to the Super Admin will show up here." />
        ) : (
          <div className="space-y-3">
            {complaints.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{c.subject}</p>
                    <p className="mt-1 text-sm text-slate-600">{c.description}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[c.status] || "bg-slate-100 text-slate-500"}`}>
                    {STATUS_LABELS[c.status] || c.status}
                  </span>
                </div>
                {c.resolutionNote && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Super Admin response: </span>
                    {c.resolutionNote}
                  </div>
                )}
                <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                  <Clock size={11} /> Submitted {c.createdAt ? new Date(c.createdAt).toLocaleString() : "—"}
                  {c.status === "RESOLVED" && c.resolvedAt && (
                    <span className="ml-2 flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 size={11} /> Resolved {new Date(c.resolvedAt).toLocaleString()}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
