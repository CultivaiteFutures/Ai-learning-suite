import { useState } from "react";
import { ShieldCheck, FileDown, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import ConfirmationDialog from "./ConfirmationDialog";

/**
 * Task #61 self-service panel: works for both a student viewing their own
 * profile (possessive="your") and a parent viewing a linked child
 * (possessive="Emma's") -- the caller supplies the already-scoped
 * exportFn/requestDeletionFn (studentAPI.* or parentAPI.* bound to a
 * specific child id), this component just renders the two actions.
 */
export default function PrivacyDataPanel({ possessive = "your", exportFn, exportFilename, requestDeletionFn }) {
  const [exporting, setExporting] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleExport() {
    setExporting(true);
    setError("");
    try {
      const res = await exportFn();
      const blob = new Blob([res.data], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = exportFilename || "data-export.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to export data. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  async function handleRequestDeletion() {
    setRequesting(true);
    setError("");
    setMessage("");
    try {
      const res = await requestDeletionFn();
      setMessage(res.data?.message || "Deletion request submitted.");
      setConfirmOpen(false);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to submit deletion request.");
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2 text-slate-900 font-semibold">
        <ShieldCheck size={18} className="text-indigo-600" />
        <h3>Privacy & Data</h3>
      </div>
      <p className="text-xs text-slate-500">
        Download a full copy of everything the platform holds, or request that {possessive} account be permanently
        deleted -- a school admin reviews the request before anything is erased.
      </p>

      {message && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200">
          <CheckCircle2 size={14} className="shrink-0 text-emerald-600" /> <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-800 border border-rose-200">
          <AlertCircle size={14} className="shrink-0 text-rose-600" /> <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
          {exporting ? "Preparing..." : "Download Data"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={requesting}
          className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
        >
          <Trash2 size={14} /> Request Account Deletion
        </button>
      </div>

      <ConfirmationDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Request account deletion?"
        message={`This sends a request to the school admin to permanently erase ${possessive} account and all data. This is not instant -- the admin reviews it first.`}
        confirmLabel="Submit request"
        tone="warning"
        loading={requesting}
        onConfirm={handleRequestDeletion}
      />
    </div>
  );
}
