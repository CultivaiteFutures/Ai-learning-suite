import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import InputField from "../ui/InputField";
import SelectField from "../ui/SelectField";
import PrimaryButton from "../ui/PrimaryButton";
import mockGrades from "../../data/mockGrades.json";

const GRADE_OPTIONS = mockGrades.map((g) => ({ value: g.name, label: g.name }));
const SECTION_OPTIONS = ["A", "B", "C"].map((s) => ({ value: s, label: `Section ${s}` }));
const STATUS_OPTIONS = [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }];

const EMPTY_FORM = {
  name: "",
  email: "",
  grade: GRADE_OPTIONS[0].value,
  section: "A",
  guardianName: "",
  status: "active",
  enrollmentDate: new Date().toISOString().slice(0, 10),
};

export default function StudentFormModal({ isOpen, onClose, onSave, initialData }) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData ? { ...initialData } : EMPTY_FORM);
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
    if (!formData.name.trim()) errs.name = "Name is required";
    if (!formData.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = "Enter a valid email";
    if (!formData.guardianName.trim()) errs.guardianName = "Guardian name is required";
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    setTimeout(() => {
      onSave(formData);
      setSaving(false);
    }, 400);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Student" : "Add Student"} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField label="Full Name" name="name" value={formData.name} onChange={handleChange} error={errors.name} placeholder="e.g. Aarav Mehta" />
        <InputField label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} error={errors.email} placeholder="student@school.edu" />
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Grade" name="grade" value={formData.grade} onChange={handleChange} options={GRADE_OPTIONS} />
          <SelectField label="Section" name="section" value={formData.section} onChange={handleChange} options={SECTION_OPTIONS} />
        </div>
        <InputField label="Guardian Name" name="guardianName" value={formData.guardianName} onChange={handleChange} error={errors.guardianName} placeholder="Parent / Guardian full name" />
        <SelectField label="Status" name="status" value={formData.status} onChange={handleChange} options={STATUS_OPTIONS} />

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <div className="w-36">
            <PrimaryButton type="submit" loading={saving}>
              {initialData ? "Save Changes" : "Add Student"}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </Modal>
  );
}