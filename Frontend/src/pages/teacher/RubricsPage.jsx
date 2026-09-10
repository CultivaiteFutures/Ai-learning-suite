import { useState, useEffect } from "react";
import { ClipboardList, Plus, Trash2, Pencil, X } from "lucide-react";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import ConfirmationDialog from "../../components/common/ConfirmationDialog";
import Modal from "../../components/ui/Modal";
import InputField from "../../components/ui/InputField";
import PrimaryButton from "../../components/ui/PrimaryButton";
import { rubricsAPI } from "../../services/api";

function emptyCriterion() {
  return { title: "", description: "", maxPoints: 10 };
}

function RubricFormModal({ isOpen, onClose, onSaved, initialData }) {
  const [title, setTitle] = useState("");
  const [criteria, setCriteria] = useState([emptyCriterion()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title);
        setCriteria(initialData.criteria.map((c) => ({ title: c.title, description: c.description || "", maxPoints: c.maxPoints })));
      } else {
        setTitle("");
        setCriteria([emptyCriterion()]);
      }
      setError("");
    }
  }, [isOpen, initialData]);

  const totalPoints = criteria.reduce((sum, c) => sum + (Number(c.maxPoints) || 0), 0);

  function updateCriterion(idx, field, value) {
    setCriteria((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  }

  function addCriterion() {
    setCriteria((prev) => [...prev, emptyCriterion()]);
  }

  function removeCriterion(idx) {
    setCriteria((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Rubric title is required.");
      return;
    }
    const cleaned = criteria
      .filter((c) => c.title.trim())
      .map((c) => ({ title: c.title.trim(), description: c.description.trim() || null, maxPoints: Number(c.maxPoints) || 1 }));
    if (cleaned.length === 0) {
      setError("Add at least one criterion.");
      return;
    }

    setSaving(true);
    setError("");
    const payload = { title: title.trim(), criteria: cleaned };
    const request = initialData ? rubricsAPI.update(initialData.id, payload) : rubricsAPI.create(payload);
    request
      .then((res) => {
        onSaved(res.data);
        onClose();
      })
      .catch((err) => setError(err.response?.data?.detail || "Could not save this rubric."))
      .finally(() => setSaving(false));
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Rubric" : "New Rubric"} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <InputField label="Rubric Title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 5-Paragraph Essay" />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-700">Criteria</label>
            <span className="text-xs font-mono text-slate-400">{totalPoints} pts total</span>
          </div>
          {criteria.map((c, idx) => (
            <div key={idx} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              <div className="flex items-center gap-2">
                <input
                  value={c.title}
                  onChange={(e) => updateCriterion(idx, "title", e.target.value)}
                  placeholder={`Criterion ${idx + 1} title`}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
                <input
                  type="number"
                  min={1}
                  value={c.maxPoints}
                  onChange={(e) => updateCriterion(idx, "maxPoints", e.target.value)}
                  className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  placeholder="Points"
                />
                {criteria.length > 1 && (
                  <button type="button" onClick={() => removeCriterion(idx)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                    <X size={15} />
                  </button>
                )}
              </div>
              <input
                value={c.description}
                onChange={(e) => updateCriterion(idx, "description", e.target.value)}
                placeholder="Description (optional)"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addCriterion}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            <Plus size={13} /> Add criterion
          </button>
        </div>

        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-5 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <div className="w-36">
            <PrimaryButton type="submit" loading={saving}>Save Rubric</PrimaryButton>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default function RubricsPage() {
  const [rubrics, setRubrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  function load() {
    setLoading(true);
    rubricsAPI
      .list()
      .then((res) => setRubrics(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError("Could not load your rubrics."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function handleSaved(rubric) {
    setRubrics((prev) => {
      const exists = prev.some((r) => r.id === rubric.id);
      return exists ? prev.map((r) => (r.id === rubric.id ? rubric : r)) : [rubric, ...prev];
    });
  }

  function confirmDelete() {
    rubricsAPI
      .remove(deleteTarget.id)
      .then(() => setRubrics((prev) => prev.filter((r) => r.id !== deleteTarget.id)))
      .catch(() => setError("Could not delete this rubric."))
      .finally(() => setDeleteTarget(null));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Rubrics</h1>
          <p className="mt-1 text-sm text-slate-500">Reusable grading rubrics you can attach to any assignment.</p>
        </div>
        <button
          type="button"
          onClick={() => { setEditing(null); setFormOpen(true); }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={15} /> New Rubric
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <LoadingState rows={3} columns={2} />
        ) : rubrics.length === 0 ? (
          <EmptyState title="No rubrics yet" description="Create a rubric to grade assignments by weighted criteria instead of one raw number." icon={ClipboardList} />
        ) : (
          <div className="divide-y divide-slate-100">
            {rubrics.map((r) => (
              <div key={r.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{r.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{r.totalPoints} points total &middot; {r.criteria.length} criteria</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.criteria.map((c) => (
                      <span key={c.id} className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                        {c.title} ({c.maxPoints})
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => { setEditing(r); setFormOpen(true); }}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(r)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <RubricFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} onSaved={handleSaved} initialData={editing} />

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete rubric"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? Any assignment using it will keep its grades but lose the rubric.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
