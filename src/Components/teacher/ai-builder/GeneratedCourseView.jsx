import { RefreshCw, Save, UploadCloud, Plus } from "lucide-react";
import InlineEditableField from "../../ui/InlineEditableField";
import EditableList from "../../ui/EditableList";
import ModuleEditor from "./ModuleEditor";
import { generateId } from "../../../utils/generateId";

export default function GeneratedCourseView({
  course,
  onChange,
  onRegenerate,
  onSaveDraft,
  onPublish,
  isRegenerating,
  isSaving,
}) {
  function update(field, value) {
    onChange({ ...course, [field]: value });
  }

  function updateModule(index, updatedModule) {
    const modules = [...course.modules];
    modules[index] = updatedModule;
    onChange({ ...course, modules });
  }

  function removeModule(index) {
    onChange({ ...course, modules: course.modules.filter((_, i) => i !== index) });
  }

  function addModule() {
    onChange({
      ...course,
      modules: [
        ...course.modules,
        {
          id: generateId(),
          name: `Module ${course.modules.length + 1}`,
          description: "",
          lessons: [{ id: generateId(), title: "Lesson 1", summary: "", activity: "", homework: "", quiz: "" }],
        },
      ],
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">AI-Generated Course</p>
          <p className="text-sm text-slate-500">Edit anything below before saving or publishing.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={14} className={isRegenerating ? "animate-spin" : ""} />
            Regenerate
          </button>
          <button
            onClick={onSaveDraft}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={14} />
            Save Draft
          </button>
          <button
            onClick={onPublish}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UploadCloud size={14} />
            Publish
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <InlineEditableField
            value={course.courseName}
            onChange={(v) => update("courseName", v)}
            className="text-xl font-semibold text-slate-900"
            placeholder="Course name"
          />
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-2.5 py-1">{course.subject}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1">{course.grade}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1">{course.difficulty}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1">{course.language}</span>
          </div>

          <div className="mt-4">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Course Overview</p>
            <InlineEditableField
              as="textarea"
              rows={4}
              value={course.overview}
              onChange={(v) => update("overview", v)}
              className="text-sm leading-relaxed"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Course Objectives</p>
              <EditableList items={course.objectives} onChange={(v) => update("objectives", v)} placeholder="Add an objective..." addLabel="Add objective" />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Prerequisites</p>
              <EditableList items={course.prerequisites} onChange={(v) => update("prerequisites", v)} placeholder="Add a prerequisite..." addLabel="Add prerequisite" />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Learning Outcomes</p>
              <EditableList items={course.learningOutcomes} onChange={(v) => update("learningOutcomes", v)} placeholder="Add an outcome..." addLabel="Add outcome" />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Estimated Duration</p>
              <InlineEditableField
                value={course.estimatedDuration}
                onChange={(v) => update("estimatedDuration", v)}
                className="text-sm"
                placeholder="e.g. 6 weeks"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-900">Course Modules ({course.modules.length})</p>

          {course.modules.map((module, index) => (
            <ModuleEditor
              key={module.id}
              module={module}
              index={index}
              onChange={(updated) => updateModule(index, updated)}
              onRemove={() => removeModule(index)}
            />
          ))}

          <button
            onClick={addModule}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
          >
            <Plus size={16} /> Add Module
          </button>
        </div>
      </div>
    </div>
  );
}