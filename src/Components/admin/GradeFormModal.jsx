import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import InputField from "../ui/InputField";
import PrimaryButton from "../ui/PrimaryButton";

const EMPTY_FORM = { name: "", sections: "", capacity: "" };

export default function GradeFormModal({ isOpen, onClose, onSave, initialData }) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(
        initialData
          ? { name: initialData.name, sections: String(initialData.sections), capacity: String(initialData.capacity ?? "") }
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
    if (!formData.name.trim()) errs.name = "Grade name is required";
    if (!formData.sections || isNaN(Number(formData.sections))) errs.sections = "Enter a valid number of sections";
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
        name: formData.name,
        sections: Number(formData.sections),
        capacity: Number(formData.capacity) || 0,
      });
      setSaving(false);
    }, 400);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Grade Level" : "Add Grade Level"} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField label="Grade Name" name="name" value={formData.name} onChange={handleChange} error={errors.name} placeholder="e.g. Grade 9" />
        <InputField label="Number of Sections" name="sections" type="number" value={formData.sections} onChange={handleChange} error={errors.sections} placeholder="e.g. 3" />
        <InputField label="Capacity per Section" name="capacity" type="number" value={formData.capacity} onChange={handleChange} placeholder="e.g. 30" />

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <div className="w-36">
            <PrimaryButton type="submit" loading={saving}>
              {initialData ? "Save Changes" : "Add Grade"}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </Modal>
  );
}