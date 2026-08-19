import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import Modal from "../ui/Modal";
import InputField from "../ui/InputField";
import SelectField from "../ui/SelectField";
import TextAreaField from "../ui/TextAreaField";
import PrimaryButton from "../ui/PrimaryButton";
import { useCourses } from "../../context/CourseContext";
import { aiAPI } from "../../services/api";

const TYPE_OPTIONS = ["Quiz", "Homework", "Project"].map((t) => ({ value: t, label: t }));
const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "grading", label: "Grading" },
  { value: "closed", label: "Closed" },
];

function buildEmptyForm(lockCourseId) {
  return {
    title: "",
    description: "",
    type: TYPE_OPTIONS[0].value,
    dueDate: new Date().toISOString().slice(0, 10),
    maxPoints: "100",
    status: "open",
    courseId: lockCourseId || "",
  };
}

export default function AssignmentFormModal({ isOpen, onClose, onSave, initialData, lockCourseId }) {
  const { courses } = useCourses();
  const [formData, setFormData] = useState(buildEmptyForm(lockCourseId));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  const courseOptions = courses.map((c) => ({ value: c.id, label: c.name }));

  useEffect(() => {
    if (isOpen) {
      setFormData(
        initialData
          ? {
              ...initialData,
              maxPoints: String(initialData.maxPoints || initialData.max_points || 100),
              description: initialData.description || "",
            }
          : buildEmptyForm(lockCourseId)
      );
      setErrors({});
    }
  }, [isOpen, initialData, lockCourseId]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleAIGenerate() {
    const topic = formData.title.trim() || "Core Concepts Quiz";
    setAiGenerating(true);
    try {
      const res = await aiAPI.generateAssignment({
        topic,
        grade_level: "Grade 10",
        instructions: "Generate clear educational problem questions."
      });
      if (res.data) {
        setFormData((prev) => ({
          ...prev,
          title: res.data.title || prev.title,
          description: res.data.description || prev.description,
          maxPoints: String(res.data.max_points || 100)
        }));
      }
    } catch (err) {
      setFormData((prev) => ({
        ...prev,
        title: `AI Assignment: ${topic}`,
        description: `Complete the practice exercises on ${topic}. Answer all questions step by step.`
      }));
    } finally {
      setAiGenerating(false);
    }
  }

  function validate() {
    const errs = {};
    if (!formData.title.trim()) errs.title = "Title is required";
    if (!lockCourseId && !formData.courseId) errs.courseId = "Select a course";
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    setTimeout(() => {
      onSave({
        ...formData,
        maxPoints: Number(formData.maxPoints) || 100,
        courseId: lockCourseId || formData.courseId,
      });
      setSaving(false);
    }, 300);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Assignment" : "Add Assignment"} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-700">Assignment Details</label>
          <button
            type="button"
            onClick={handleAIGenerate}
            disabled={aiGenerating}
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
          >
            <Sparkles size={13} /> {aiGenerating ? "Generating..." : "Generate with AI"}
          </button>
        </div>

        <InputField
          label="Title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          error={errors.title}
          placeholder="e.g. Kinematics Practice Problems"
        />

        <TextAreaField
          label="Description / Instructions"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          placeholder="Detailed problem set or instructions for students..."
        />

        {!lockCourseId && (
          <SelectField
            label="Course"
            name="courseId"
            value={formData.courseId}
            onChange={handleChange}
            options={[{ value: "", label: "Select a course" }, ...courseOptions]}
            error={errors.courseId}
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Type" name="type" value={formData.type} onChange={handleChange} options={TYPE_OPTIONS} />
          <InputField label="Due Date" name="dueDate" type="date" value={formData.dueDate} onChange={handleChange} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Max Points"
            name="maxPoints"
            type="number"
            value={formData.maxPoints}
            onChange={handleChange}
            placeholder="100"
          />
          <SelectField label="Status" name="status" value={formData.status} onChange={handleChange} options={STATUS_OPTIONS} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <div className="w-36">
            <PrimaryButton type="submit" loading={saving}>
              {initialData ? "Save Changes" : "Add Assignment"}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </Modal>
  );
}