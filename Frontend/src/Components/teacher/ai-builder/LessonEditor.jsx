import { useRef } from "react";
import { X, ArrowUp, ArrowDown, Paperclip } from "lucide-react";
import InlineEditableField from "../../ui/InlineEditableField";
import EditableList from "../../ui/EditableList";

export default function LessonEditor({ lesson, index, onChange, onRemove, onMoveUp, onMoveDown }) {
  const fileInputRef = useRef(null);

  function update(field, value) {
    onChange({ ...lesson, [field]: value });
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) update("pdfAttachment", { name: file.name });
    e.target.value = "";
  }

  return (
    <div className="group relative rounded-lg border border-slate-100 bg-slate-50/60 p-4">
      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100">
        <button onClick={onMoveUp} disabled={!onMoveUp} className="rounded-md p-1 text-slate-300 hover:bg-slate-200 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-30">
          <ArrowUp size={13} />
        </button>
        <button onClick={onMoveDown} disabled={!onMoveDown} className="rounded-md p-1 text-slate-300 hover:bg-slate-200 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-30">
          <ArrowDown size={13} />
        </button>
        <button onClick={onRemove} className="rounded-md p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500">
          <X size={14} />
        </button>
      </div>

      <InlineEditableField
        value={lesson.title}
        onChange={(v) => update("title", v)}
        className="pr-20 text-sm font-semibold text-slate-900"
        placeholder={`Lesson ${index + 1} title`}
      />

      <div className="mt-3 space-y-3">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Description</p>
          <InlineEditableField as="textarea" rows={2} value={lesson.description} onChange={(v) => update("description", v)} className="text-sm" placeholder="Short summary of this lesson" />
        </div>

        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Objectives</p>
          <EditableList items={lesson.objectives || []} onChange={(v) => update("objectives", v)} placeholder="Add an objective..." addLabel="Add objective" />
        </div>

        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Lesson Content</p>
          <InlineEditableField as="textarea" rows={4} value={lesson.content} onChange={(v) => update("content", v)} className="text-sm" placeholder="The full lesson content students will read" />
        </div>

        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Activity</p>
          <InlineEditableField as="textarea" rows={2} value={lesson.activity} onChange={(v) => update("activity", v)} className="text-sm" />
        </div>

        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Quiz</p>
          <InlineEditableField as="textarea" rows={2} value={lesson.quiz} onChange={(v) => update("quiz", v)} className="text-sm" />
        </div>

        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Resources</p>
          <EditableList items={lesson.resources || []} onChange={(v) => update("resources", v)} placeholder="Add a resource link or title..." addLabel="Add resource" />
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">PDF Attachment</p>
            {lesson.pdfAttachment ? (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
                <Paperclip size={13} /> {lesson.pdfAttachment.name}
                <button onClick={() => update("pdfAttachment", null)} className="text-slate-400 hover:text-rose-500">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
              >
                <Paperclip size={13} /> Attach PDF
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileSelect} />
          </div>

          <div className="min-w-[200px] flex-1">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Video URL (placeholder)</p>
            <InlineEditableField value={lesson.videoUrl || ""} onChange={(v) => update("videoUrl", v)} className="text-sm" placeholder="https://..." />
          </div>
        </div>
      </div>
    </div>
  );
}