import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import Modal from "../ui/Modal";
import InputField from "../ui/InputField";
import SelectField from "../ui/SelectField";
import PrimaryButton from "../ui/PrimaryButton";

const GRADE_OPTIONS = [
  "Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12",
].map((g) => ({ value: g, label: g }));

const SECTION_OPTIONS = ["A", "B", "C"].map((s) => ({ value: s, label: `Section ${s}` }));
const STATUS_OPTIONS = [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }];

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  grade: GRADE_OPTIONS[4].value,
  section: "A",
  guardianName: "",
  status: "active",
  enrollmentDate: new Date().toISOString().slice(0, 10),
};

export default function StudentFormModal({ isOpen, onClose, onSave, initialData }) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({ ...initialData, password: "" });
      } else {
        setFormData(EMPTY_FORM);
      }
      setErrors({});
      setShowPassword(false);
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

    // Password is optional -- leave blank to have the server generate a secure
    // one; if provided, it must meet the minimum length.
    if (formData.password && formData.password.trim().length < 6) {
      errs.password = "Password must be at least 6 characters";
    }
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
    }, 300);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Student" : "Add Student"} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField label="Full Name *" name="name" value={formData.name} onChange={handleChange} error={errors.name} placeholder="e.g. Alex Rivera" />
        <InputField label="Email Address *" name="email" type="email" value={formData.email} onChange={handleChange} error={errors.email} placeholder="student@school.edu" />

        {!initialData && (
          <div>
            <div className="mb-1.5">
              <label className="text-sm font-medium text-slate-700">Student Password (leave blank to auto-generate)</label>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                placeholder="Leave blank for a server-generated password"
                className={`w-full rounded-lg border bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  errors.password
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
                    : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs font-medium text-rose-600">{errors.password}</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Grade" name="grade" value={formData.grade} onChange={handleChange} options={GRADE_OPTIONS} />
          <SelectField label="Section" name="section" value={formData.section} onChange={handleChange} options={SECTION_OPTIONS} />
        </div>
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