import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import InputField from "../ui/InputField";
import SelectField from "../ui/SelectField";
import TextAreaField from "../ui/TextAreaField";
import PrimaryButton from "../ui/PrimaryButton";
import mockGrades from "../../data/mockGrades.json";

const SUBJECT_OPTIONS = ["Mathematics", "Science", "English", "History", "Computer Science", "Art", "Music", "Physical Education"].map((s) => ({ value: s, label: s }));
const GRADE_OPTIONS = mockGrades.map((g) => ({ value: g.name, label: g.name }));
const EMPTY_FORM = { name: "", subject: SUBJECT_OPTIONS[0].value, grade: GRADE_OPTIONS[0].value, description: "", modulesCount: "4", lessonsCount: "12" };

export default function GoldenTemplateFormModal({ isOpen, onClose, onSave, initialData }) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(
        initialData
          ? {
              name: initialData.name, subject: initialData.subject, grade: initialData.grade,
              description: initialData.description, modulesCount: String(initialData.modulesCount), lessonsCount: String(initialData.lessonsCount),
            }
          : EMPTY_FORM
      );
    }
  }, [isOpen, initialData]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      onSave({ ...formData, modulesCount: Number(formData.modulesCount) || 0, lessonsCount: Number(formData.lessonsCount) || 0 });
      setSaving(false);
    }, 400);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Golden Template" : "Add Golden Source Template"} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField label="Template Name" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Algebra Foundations" />
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Subject" name="subject" value={formData.subject} onChange={handleChange} options={SUBJECT_OPTIONS} />
          <SelectField label="Grade" name="grade" value={formData.grade} onChange={handleChange} options={GRADE_OPTIONS} />
        </div>
        <TextAreaField label="Description" name="description" value={formData.description} onChange={handleChange} rows={4} />
        <div className="grid grid-cols-2 gap-4">
          <InputField label="Modules" name="modulesCount" type="number" value={formData.modulesCount} onChange={handleChange} />
          <InputField label="Lessons" name="lessonsCount" type="number" value={formData.lessonsCount} onChange={handleChange} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <div className="w-36">
            <PrimaryButton type="submit" loading={saving}>{initialData ? "Save Changes" : "Add Template"}</PrimaryButton>
          </div>
        </div>
      </form>
    </Modal>
  );
}