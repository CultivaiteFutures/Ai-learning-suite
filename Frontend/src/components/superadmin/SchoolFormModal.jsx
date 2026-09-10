import { useState, useEffect } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import Modal from "../ui/Modal";
import InputField from "../ui/InputField";
import SelectField from "../ui/SelectField";
import PrimaryButton from "../ui/PrimaryButton";

const PLAN_OPTIONS = ["Trial", "Basic", "Professional", "Premium", "Enterprise"].map((p) => ({ value: p, label: p }));
const AI_OPTIONS = [
  { value: "gemini", label: "Google Gemini (Recommended - Active)" },
  { value: "claude", label: "Anthropic Claude" },
];

const EMPTY_FORM = {
  schoolName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  country: "",
  principalName: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
  aiProvider: "gemini",
  subscriptionPlan: "Professional",
  studentLimit: "500",
  teacherLimit: "50",
  logo: "",
};

export default function SchoolFormModal({ isOpen, onClose, onSave, initialData }) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          schoolName: initialData.schoolName || initialData.name || "",
          email: initialData.email || "",
          phone: initialData.phone || "",
          address: initialData.address || "",
          city: initialData.city || "",
          state: initialData.state || "",
          country: initialData.country || "",
          principalName: initialData.principalName || "",
          adminName: initialData.adminName || "",
          adminEmail: initialData.adminEmail || "",
          adminPassword: "",
          aiProvider: initialData.aiProvider || initialData.ai_provider || "gemini",
          subscriptionPlan: initialData.subscriptionPlan || "Professional",
          studentLimit: String(initialData.studentLimit || 500),
          teacherLimit: String(initialData.teacherLimit || 50),
          logo: initialData.logo || "",
        });
      } else {
        setFormData(EMPTY_FORM);
      }
      setErrors({});
      setShowPassword(false);
    }
  }, [isOpen, initialData]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      // Auto-suggest admin name if principal name changes and admin name not manually edited
      if (name === "principalName" && (!prev.adminName || prev.adminName === prev.principalName)) {
        updated.adminName = value;
      }
      // Auto-suggest admin email if contact email changes and admin email not manually edited
      if (name === "email" && (!prev.adminEmail || prev.adminEmail === prev.email)) {
        updated.adminEmail = value;
      }
      return updated;
    });
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function validate() {
    const errs = {};
    if (!formData.schoolName.trim()) errs.schoolName = "School name is required";
    if (!formData.email.trim()) errs.email = "Contact email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = "Enter a valid contact email";

    if (!initialData) {
      const effectiveAdminEmail = formData.adminEmail || formData.email;
      if (!effectiveAdminEmail.trim()) {
        errs.adminEmail = "Admin login email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(effectiveAdminEmail)) {
        errs.adminEmail = "Enter a valid admin login email";
      }
    }

    // Admin password is optional in both modes: leave blank to have the server
    // generate a secure one; if the caller types their own, it must meet the
    // minimum length.
    if (formData.adminPassword && formData.adminPassword.trim().length < 6) {
      errs.adminPassword = initialData ? "New password must be at least 6 characters" : "Password must be at least 6 characters";
    }

    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    const effectiveAdminEmail = formData.adminEmail || formData.email;
    const effectiveAdminName = formData.adminName || formData.principalName || `${formData.schoolName} Admin`;

    setTimeout(() => {
      onSave({
        ...formData,
        adminEmail: effectiveAdminEmail,
        adminName: effectiveAdminName,
        studentLimit: Number(formData.studentLimit) || 500,
        teacherLimit: Number(formData.teacherLimit) || 50,
      });
      setSaving(false);
    }, 300);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit School" : "Onboard New School"} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic School Information */}
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="School Name *"
            name="schoolName"
            value={formData.schoolName}
            onChange={handleChange}
            error={errors.schoolName}
            placeholder="e.g. Greenwood High School"
          />
          <InputField
            label="Principal / Head Name"
            name="principalName"
            value={formData.principalName}
            onChange={handleChange}
            placeholder="e.g. Dr. Meera Kapoor"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Contact Email *"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            placeholder="contact@school.edu"
          />
          <InputField
            label="Phone Number"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+91 98765 43210"
          />
        </div>

        {/* Admin Login Credentials Section */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-white">
              <KeyRound size={14} />
            </div>
            <h4 className="text-sm font-semibold text-indigo-950">
              School Administrator Login Credentials
            </h4>
          </div>
          <p className="text-xs text-indigo-700/80">
            {initialData
              ? "Update administrator account name, email, or set a new password for this school."
              : "Set the initial login email and password the School Admin will use to log into their dashboard."}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="Admin Full Name"
              name="adminName"
              value={formData.adminName}
              onChange={handleChange}
              placeholder="e.g. Dr. Meera Kapoor (Admin)"
            />
            <InputField
              label="Admin Login Email *"
              name="adminEmail"
              type="email"
              value={formData.adminEmail}
              onChange={handleChange}
              error={errors.adminEmail}
              placeholder="admin@school.edu"
            />
          </div>

          <div>
            <div className="mb-1.5">
              <label className="text-sm font-medium text-slate-700">
                {initialData ? "Admin Password (leave blank to keep current)" : "Admin Password (leave blank to auto-generate)"}
              </label>
            </div>

            <div className="relative">
              <input
                id="adminPassword"
                name="adminPassword"
                type={showPassword ? "text" : "password"}
                value={formData.adminPassword}
                onChange={handleChange}
                placeholder={initialData ? "Enter new password to change" : "Leave blank for a server-generated password"}
                className={`w-full rounded-lg border bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  errors.adminPassword
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
                    : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.adminPassword && (
              <p className="mt-1 text-xs font-medium text-rose-600">{errors.adminPassword}</p>
            )}
          </div>
        </div>

        {/* AI & Subscription Config */}
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="AI Engine Provider"
            name="aiProvider"
            value={formData.aiProvider}
            onChange={handleChange}
            options={AI_OPTIONS}
          />
          <SelectField
            label="Subscription Plan"
            name="subscriptionPlan"
            value={formData.subscriptionPlan}
            onChange={handleChange}
            options={PLAN_OPTIONS}
          />
        </div>

        {/* Location & Limits */}
        <div className="grid grid-cols-3 gap-3">
          <InputField label="City" name="city" value={formData.city} onChange={handleChange} placeholder="City" />
          <InputField label="State" name="state" value={formData.state} onChange={handleChange} placeholder="State" />
          <InputField label="Country" name="country" value={formData.country} onChange={handleChange} placeholder="Country" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <InputField label="Student Limit" name="studentLimit" type="number" value={formData.studentLimit} onChange={handleChange} />
          <InputField label="Teacher Limit" name="teacherLimit" type="number" value={formData.teacherLimit} onChange={handleChange} />
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
              {initialData ? "Save Changes" : "Onboard School"}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </Modal>
  );
}
