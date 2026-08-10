import { useState } from "react";
import { Sparkles, Pencil, Trash2, Plus } from "lucide-react";
import GoldenTemplateFormModal from "../../components/superadmin/GoldenTemplateFormModal";
import ConfirmationDialog from "../../components/common/ConfirmationDialog";
import { useSchools } from "../../context/SchoolContext";

export default function PlatformSettingsPage() {
  const { goldenTemplates, addGoldenTemplate, updateGoldenTemplate, deleteGoldenTemplate } = useSchools();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(template) {
    setEditing(template);
    setFormOpen(true);
  }

  function handleSave(data) {
    if (editing) updateGoldenTemplate(editing.id, data);
    else addGoldenTemplate(data);
    setFormOpen(false);
  }

  function confirmDelete() {
    deleteGoldenTemplate(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Platform Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Platform-wide configuration and Golden Source template management.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">General</h2>
        <p className="mt-1 text-xs text-slate-500">
          Platform-level settings (branding, default limits, notification policy) will be persisted here once the FastAPI settings endpoint exists.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-500" />
            <h2 className="text-sm font-semibold text-slate-900">Golden Source Templates</h2>
          </div>
          <button onClick={openCreate} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">
            <Plus size={14} /> Add Template
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {goldenTemplates.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{t.name}</p>
                <p className="text-xs text-slate-500">{t.subject} · {t.grade} · {t.modulesCount} modules · {t.lessonsCount} lessons</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(t)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"><Pencil size={15} /></button>
                <button onClick={() => setDeleteTarget(t)} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <GoldenTemplateFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} onSave={handleSave} initialData={editing} />

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete template"
        message={`Delete "${deleteTarget?.name}"? Schools that already adopted a copy keep their own version.`}
        confirmLabel="Delete"
      />
    </div>
  );
}