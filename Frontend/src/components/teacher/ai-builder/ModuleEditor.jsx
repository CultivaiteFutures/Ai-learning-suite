import { useState } from "react";
import { ChevronDown, ChevronUp, ArrowUp, ArrowDown, Plus, Trash2, CalendarClock, Link2 } from "lucide-react";
import InlineEditableField from "../../ui/InlineEditableField";
import InputField from "../../ui/InputField";
import SelectField from "../../ui/SelectField";
import LessonEditor from "./LessonEditor";
import { generateId } from "../../../utils/generateId";

// "2026-11-01T09:00:00+00:00" (or similar) -> "2026-11-01T09:00" for a
// <input type="datetime-local">. Returns "" for anything unparsable/empty.
function toDatetimeLocalValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ModuleEditor({ module, index, onChange, onRemove, onMoveUp, onMoveDown, allModules = [], onScheduleChange }) {
  const [collapsed, setCollapsed] = useState(false);

  function update(field, value) {
    onChange({ ...module, [field]: value });
  }

  function updateLesson(lessonIndex, updatedLesson) {
    const lessons = [...module.lessons];
    lessons[lessonIndex] = updatedLesson;
    onChange({ ...module, lessons });
  }

  function removeLesson(lessonIndex) {
    onChange({ ...module, lessons: module.lessons.filter((_, i) => i !== lessonIndex) });
  }

  function moveLesson(lessonIndex, direction) {
    const lessons = [...module.lessons];
    const swapWith = direction === "up" ? lessonIndex - 1 : lessonIndex + 1;
    if (swapWith < 0 || swapWith >= lessons.length) return;
    [lessons[lessonIndex], lessons[swapWith]] = [lessons[swapWith], lessons[lessonIndex]];
    onChange({ ...module, lessons });
  }

  function addLesson() {
    onChange({
      ...module,
      lessons: [
        ...module.lessons,
        {
          id: generateId(),
          title: `Lesson ${module.lessons.length + 1}`,
          description: "",
          objectives: [],
          content: "",
          activity: "",
          quiz: "",
          resources: [],
          pdfAttachment: null,
          videoUrl: "",
        },
      ],
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-start gap-3 p-4">
        <div className="mt-1 flex shrink-0 flex-col gap-0.5">
          <button
            onClick={onMoveUp}
            disabled={!onMoveUp}
            className="rounded-md p-0.5 text-slate-300 hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowUp size={13} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={!onMoveDown}
            className="rounded-md p-0.5 text-slate-300 hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowDown size={13} />
          </button>
        </div>

        <button
          onClick={() => setCollapsed((v) => !v)}
          className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
        >
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>

        <div className="flex-1">
          <InlineEditableField
            value={module.name}
            onChange={(v) => update("name", v)}
            className="text-sm font-semibold text-slate-900"
            placeholder={`Module ${index + 1} name`}
          />
          <InlineEditableField
            as="textarea"
            rows={2}
            value={module.description}
            onChange={(v) => update("description", v)}
            className="mt-1 text-sm text-slate-600"
            placeholder="Module description"
          />
        </div>

        <button onClick={onRemove} className="shrink-0 rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500">
          <Trash2 size={15} />
        </button>
      </div>

      {!collapsed && (
        <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-4">
          {onScheduleChange && (
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-2">
              <InputField
                label="Release date (optional)"
                name={`publishAt-${module.id}`}
                type="datetime-local"
                value={toDatetimeLocalValue(module.publishAt || module.publish_at)}
                onChange={(e) => onScheduleChange("publishAt", e.target.value ? new Date(e.target.value).toISOString() : null)}
              />
              <SelectField
                label="Prerequisite module (optional)"
                name={`prerequisiteModuleId-${module.id}`}
                value={module.prerequisiteModuleId || module.prerequisite_module_id || ""}
                onChange={(e) => onScheduleChange("prerequisiteModuleId", e.target.value || null)}
                options={[
                  { value: "", label: "No prerequisite" },
                  ...allModules
                    .filter((m) => m.id !== module.id)
                    .map((m) => ({ value: m.id, label: m.name || m.title || "Untitled Module" })),
                ]}
              />
              <p className="col-span-full flex items-center gap-1.5 text-[11px] text-slate-400">
                <CalendarClock size={12} /> Hides this module from students until the release date.
                <Link2 size={12} className="ml-2" /> Locks this module until the prerequisite is fully completed.
              </p>
            </div>
          )}

          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Lessons ({module.lessons.length})</p>
          {module.lessons.map((lesson, i) => (
            <LessonEditor
              key={lesson.id}
              lesson={lesson}
              index={i}
              onChange={(updated) => updateLesson(i, updated)}
              onRemove={() => removeLesson(i)}
              onMoveUp={i > 0 ? () => moveLesson(i, "up") : null}
              onMoveDown={i < module.lessons.length - 1 ? () => moveLesson(i, "down") : null}
            />
          ))}
          <button
            onClick={addLesson}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
          >
            <Plus size={14} /> Add Lesson
          </button>
        </div>
      )}
    </div>
  );
}