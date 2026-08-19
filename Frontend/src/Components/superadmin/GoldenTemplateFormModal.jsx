import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import InputField from "../ui/InputField";
import SelectField from "../ui/SelectField";
import TextAreaField from "../ui/TextAreaField";
import PrimaryButton from "../ui/PrimaryButton";

const SUBJECT_OPTIONS = ["Mathematics", "Science", "English", "History", "Computer Science", "Physics", "Chemistry", "Biology", "Art", "Music", "Physical Education"].map((s) => ({ value: s, label: s }));
const GRADE_OPTIONS = ["Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"].map((g) => ({ value: g, label: g }));

const EMPTY_FORM = {
  name: "",
  subject: SUBJECT_OPTIONS[0].value,
  grade: GRADE_OPTIONS[4].value,
  description: "",
  modulesCount: "4",
  lessonsCount: "12",
};

export default function GoldenTemplateFormModal({ isOpen, onClose, onSave, initialData }) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(
        initialData
          ? {
              name: initialData.name || initialData.title || "",
              subject: initialData.subject || SUBJECT_OPTIONS[0].value,
              grade: initialData.grade || initialData.grade_level || GRADE_OPTIONS[4].value,
              description: initialData.description || "",
              modulesCount: String(initialData.modulesCount || initialData.modules?.length || 4),
              lessonsCount: String(initialData.lessonsCount || 12),
            }
          : EMPTY_FORM
      );
      setErrors({});
    }
  }, [isOpen, initialData]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function validate() {
    const errs = {};
    if (!formData.name.trim()) errs.name = "Template title is required";
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      await onSave({
        ...formData,
        modulesCount: Number(formData.modulesCount) || 0,
        lessonsCount: Number(formData.lessonsCount) || 0,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Golden Template" : "Create Golden Source Template"} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField
          label="Template Course Title *"
          name="name"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          placeholder="e.g. Algebra & Functions Masterclass"
        />

        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Subject" name="subject" value={formData.subject} onChange={handleChange} options={SUBJECT_OPTIONS} />
          <SelectField label="Target Grade" name="grade" value={formData.grade} onChange={handleChange} options={GRADE_OPTIONS} />
        </div>

        <TextAreaField
          label="Course Overview & Objectives"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Detailed description of what schools and students will master in this standard curriculum template..."
          rows={3}
        />

        <div className="grid grid-cols-2 gap-4">
          <InputField label="Planned Modules" name="modulesCount" type="number" value={formData.modulesCount} onChange={handleChange} />
          <InputField label="Planned Lessons" name="lessonsCount" type="number" value={formData.lessonsCount} onChange={handleChange} />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <div className="w-40">
            <PrimaryButton type="submit" loading={saving}>
              {initialData ? "Save Changes" : "Create Template"}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </Modal>
  );
}