import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import InputField from "../ui/InputField";
import SelectField from "../ui/SelectField";
import PrimaryButton from "../ui/PrimaryButton";

const PLAN_OPTIONS = ["Trial", "Basic", "Premium", "Enterprise"].map((p) => ({ value: p, label: p }));

const EMPTY_FORM = {
  schoolName: "", email: "", phone: "", address: "", city: "", state: "", country: "",
  principalName: "", subscriptionPlan: "Trial", studentLimit: "500", teacherLimit: "50", logo: "",
};

export default function SchoolFormModal({ isOpen, onClose, onSave, initialData }) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(
        initialData
          ? {
              schoolName: initialData.schoolName, email: initialData.email, phone: initialData.phone,
              address: initialData.address, city: initialData.city, state: initialData.state, country: initialData.country,
              principalName: initialData.principalName, subscriptionPlan: initialData.subscriptionPlan,
              studentLimit: String(initialData.studentLimit), teacherLimit: String(initialData.teacherLimit),
              logo: initialData.logo || "",
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
    if (!formData.schoolName.trim()) errs.schoolName = "School name is required";
    if (!formData.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = "Enter a valid email";
    if (!formData.principalName.trim()) errs.principalName = "Principal name is required";
    if (!formData.city.trim()) errs.city = "City is required";
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    setTimeout(() => {
      onSave({ ...formData, studentLimit: Number(formData.studentLimit) || 0, teacherLimit: Number(formData.teacherLimit) || 0 });
      setSaving(false);
    }, 400);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit School" : "Onboard New School"} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <InputField label="School Name" name="schoolName" value={formData.schoolName} onChange={handleChange} error={errors.schoolName} placeholder="e.g. Greenwood High School" />
          <InputField label="Principal Name" name="principalName" value={formData.principalName} onChange={handleChange} error={errors.principalName} placeholder="e.g. Dr. Meera Kapoor" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <InputField label="Contact Email" name="email" type="email" value={formData.email} onChange={handleChange} error={errors.email} placeholder="contact@school.edu" />
          <InputField label="Phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="+91 98765 43210" />
        </div>
        <InputField label="Address" name="address" value={formData.address} onChange={handleChange} placeholder="Street address" />
        <div className="grid grid-cols-3 gap-4">
          <InputField label="City" name="city" value={formData.city} onChange={handleChange} error={errors.city} placeholder="City" />
          <InputField label="State" name="state" value={formData.state} onChange={handleChange} placeholder="State" />
          <InputField label="Country" name="country" value={formData.country} onChange={handleChange} placeholder="Country" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <SelectField label="Subscription Plan" name="subscriptionPlan" value={formData.subscriptionPlan} onChange={handleChange} options={PLAN_OPTIONS} />
          <InputField label="Student Limit" name="studentLimit" type="number" value={formData.studentLimit} onChange={handleChange} />
          <InputField label="Teacher Limit" name="teacherLimit" type="number" value={formData.teacherLimit} onChange={handleChange} />
        </div>
        <InputField label="Logo URL (optional)" name="logo" value={formData.logo} onChange={handleChange} placeholder="https://..." />

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <div className="w-40">
            <PrimaryButton type="submit" loading={saving}>{initialData ? "Save Changes" : "Onboard School"}</PrimaryButton>
          </div>
        </div>
      </form>
    </Modal>
  );
}