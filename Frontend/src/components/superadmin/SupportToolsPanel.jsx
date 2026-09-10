import { useState, useEffect } from "react";
import { KeyRound, MessageSquarePlus, Copy, CheckCircle2, Loader2 } from "lucide-react";
import { superAdminAPI } from "../../services/api";

/**
 * Task #58: Super Admin support tooling for one school -- reset the School
 * Admin's own password (the school-scoped reset-password endpoint
 * deliberately excludes ADMIN accounts, so this is the only recovery path
 * for a locked-out School Admin), plus an internal notes log for
 * support/customer-success tracking, visible only to Super Admin.
 */
export default function SupportToolsPanel({ school }) {
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState(null);
  const [resetError, setResetError] = useState("");
  const [copied, setCopied] = useState(false);

  function loadNotes() {
    setLoadingNotes(true);
    superAdminAPI
      .getSupportNotes(school.id)
      .then((res) => setNotes(Array.isArray(res.data) ? res.data : []))
      .catch(() => setNotes([]))
      .finally(() => setLoadingNotes(false));
  }

  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [school.id]);

  async function handleAddNote() {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      await superAdminAPI.addSupportNote(school.id, newNote.trim());
      setNewNote("");
      loadNotes();
    } catch (err) {
      // best-effort -- surfaced implicitly by the note not appearing
    } finally {
      setSavingNote(false);
    }
  }

  async function handleResetAdminPassword() {
    if (!school.adminId) {
      setResetError("This school has no linked admin account id yet.");
      return;
    }
    setResetting(true);
    setResetError("");
    setResetResult(null);
    try {
      const res = await superAdminAPI.resetUserPasswordSupport(school.adminId);
      setResetResult({ email: res.data.email, password: res.data.generatedPassword });
    } catch (err) {
      setResetError(err.response?.data?.detail || "Failed to reset the admin's password.");
    } finally {
      setResetting(false);
    }
  }

  function handleCopy() {
    if (!resetResult) return;
    navigator.clipboard?.writeText(`Email: ${resetResult.email}\nNew Password: ${resetResult.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 space-y-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
          <KeyRound size={16} /> Reset School Admin Password
        </h3>
        <p className="text-xs text-amber-800/80">
          Generates a new password for this school's Admin account and reveals it once here -- use this when a School
          Admin is locked out (this is the only support path, since a peer Admin cannot reset another Admin's password).
        </p>
        <button
          type="button"
          onClick={handleResetAdminPassword}
          disabled={resetting}
          className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {resetting ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
          {resetting ? "Resetting..." : "Generate New Password"}
        </button>
        {resetError && <p className="text-xs font-medium text-rose-600">{resetError}</p>}
        {resetResult && (
          <div className="rounded-lg border border-emerald-200 bg-white p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 size={13} /> New credentials generated
            </div>
            <p className="text-xs text-slate-600">Email: <span className="font-mono font-medium text-slate-900">{resetResult.email}</span></p>
            <p className="text-xs text-slate-600">Password: <span className="font-mono font-medium text-slate-900">{resetResult.password}</span></p>
            <button type="button" onClick={handleCopy} className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800">
              <Copy size={11} /> {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
          <MessageSquarePlus size={16} className="text-indigo-600" /> Internal Support Notes
        </h3>
        <p className="text-xs text-slate-500">Visible only to Super Admin -- track calls, follow-ups, and issues for this school.</p>
        <div className="flex gap-2">
          <input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
            placeholder="Add a note..."
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddNote}
            disabled={savingNote || !newNote.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {savingNote ? "Saving..." : "Add"}
          </button>
        </div>
        {loadingNotes ? (
          <p className="text-xs text-slate-400">Loading notes...</p>
        ) : notes.length === 0 ? (
          <p className="text-xs italic text-slate-400">No support notes yet for this school.</p>
        ) : (
          <ul className="space-y-2 max-h-72 overflow-y-auto">
            {notes.map((n) => (
              <li key={n.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 text-xs">
                <p className="text-slate-700">{n.note}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {n.author_name || "Super Admin"} · {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
