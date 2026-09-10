import { useState, useEffect } from "react";
import { Eye, EyeOff, KeyRound, ChevronLeft, ChevronRight, CheckCircle2, School, Users, Settings } from "lucide-react";
import Modal from "../ui/Modal";
import InputField from "../ui/InputField";
import SelectField from "../ui/SelectField";
import PrimaryButton from "../ui/PrimaryButton";

/**
 * Task #55: a guided, step-by-step onboarding wizard for standing up a
 * brand-new school -- replaces the old single dense "everything at once"
 * form (still used for editing an existing school via SchoolFormModal)
 * with four short steps plus a review screen, so a Super Admin can walk
 * through it without missing a field. The actual creation call (and what
 * it sets up server-side -- K-12 grades, subscription, admin account) is
 * unchanged; this only restructures how the Super Admin fills it in.
 */
const STEPS = ["School Basics", "Admin Account", "Plan & Limits", "Review & Create"];

const PLAN_OPTIONS = ["Trial", "Basic", "Professional", "Premium", "Enterprise"].map((p) => ({ value: p, label: p }));
const AI_OPTIONS = [
  { value: "gemini", label: "Google Gemini (Recommended - Active)" },
  { value: "claude", label: "Anthropic Claude" },
];

const EMPTY_FORM = {
  schoolName: "", email: "", phone: "", address: "", city: "", state: "", country: "",
  principalName: "", adminName: "", adminEmail: "", adminPassword: "",
  aiProvider: "gemini", subscriptionPlan: "Professional", studentLimit: "500", teacherLimit: "50", logo: "",
};

export default function OnboardingWizardModal({ isOpen, onClose, onSave }) {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setFormData(EMPTY_FORM);
      setErrors({});
      setSaveError("");
      setShowPassword(false);
    }
  }, [isOpen]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "principalName" && (!prev.adminName || prev.adminName === prev.principalName)) updated.adminName = value;
      if (name === "email" && (!prev.adminEmail || prev.adminEmail === prev.email)) updated.adminEmail = value;
      return updated;
    });
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function validateStep(stepIndex) {
    const errs = {};
    if (stepIndex === 0) {
      if (!formData.schoolName.trim()) errs.schoolName = "School name is required";
      if (!formData.email.trim()) errs.email = "Contact email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = "Enter a valid contact email";
    }
    if (stepIndex === 1) {
      const effectiveAdminEmail = formData.adminEmail || formData.email;
      if (!effectiveAdminEmail.trim()) errs.adminEmail = "Admin login email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(effectiveAdminEmail)) errs.adminEmail = "Enter a valid admin login email";
      if (formData.adminPassword && formData.adminPassword.trim().length < 6) {
        errs.adminPassword = "Password must be at least 6 characters";
      }
    }
    return errs;
  }

  function handleNext() {
    const errs = validateStep(step);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function handleBack() {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleCreate() {
    const errs = { ...validateStep(0), ...validateStep(1) };
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setStep(errs.schoolName || errs.email ? 0 : 1);
      return;
    }
    setSaving(true);
    setSaveError("");
    const effectiveAdminEmail = formData.adminEmail || formData.email;
    const effectiveAdminName = formData.adminName || formData.principalName || `${formData.schoolName} Admin`;
    try {
      await onSave({
        ...formData,
        adminEmail: effectiveAdminEmail,
        adminName: effectiveAdminName,
        studentLimit: Number(formData.studentLimit) || 500,
        teacherLimit: Number(formData.teacherLimit) || 50,
      });
    } catch (err) {
      setSaveError(err.response?.data?.detail || "Something went wrong creating this school. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const STEP_ICONS = [School, KeyRound, Settings, CheckCircle2];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Onboard a New School" maxWidth="max-w-2xl">
      <div className="space-y-5">
        {/* Step progress indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((label, idx) => {
            const Icon = STEP_ICONS[idx];
            const isActive = idx === step;
            const isDone = idx < step;
            return (
              <div key={label} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                    isDone
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : isActive
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-white text-slate-300"
                  }`}
                >
                  {isDone ? <CheckCircle2 size={16} /> : <Icon size={14} />}
                </div>
                {idx < STEPS.length - 1 && <div className={`h-0.5 flex-1 ${isDone ? "bg-emerald-500" : "bg-slate-200"}`} />}
              </div>
            );
          })}
        </div>
        <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>

        {/* Step 1: School Basics */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InputField label="School Name *" name="schoolName" value={formData.schoolName} onChange={handleChange} error={errors.schoolName} placeholder="e.g. Greenwood High School" />
              <InputField label="Principal / Head Name" name="principalName" value={formData.principalName} onChange={handleChange} placeholder="e.g. Dr. Meera Kapoor" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Contact Email *" name="email" type="email" value={formData.email} onChange={handleChange} error={errors.email} placeholder="contact@school.edu" />
              <InputField label="Phone Number" name="phone" value={formData.phone} onChange={handleChange} placeholder="+91 98765 43210" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <InputField label="City" name="city" value={formData.city} onChange={handleChange} placeholder="City" />
              <InputField label="State" name="state" value={formData.state} onChange={handleChange} placeholder="State" />
              <InputField label="Country" name="country" value={formData.country} onChange={handleChange} placeholder="Country" />
            </div>
          </div>
        )}

        {/* Step 2: Admin Account */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
              <p className="text-xs text-indigo-700/80">
                This is the login the School Admin will use to sign into their dashboard for the first time.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Admin Full Name" name="adminName" value={formData.adminName} onChange={handleChange} placeholder="e.g. Dr. Meera Kapoor (Admin)" />
                <InputField label="Admin Login Email *" name="adminEmail" type="email" value={formData.adminEmail} onChange={handleChange} error={errors.adminEmail} placeholder="admin@school.edu" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Admin Password (leave blank to auto-generate)
                </label>
                <div className="relative">
                  <input
                    name="adminPassword"
                    type={showPassword ? "text" : "password"}
                    value={formData.adminPassword}
                    onChange={handleChange}
                    placeholder="Leave blank for a server-generated password"
                    className={`w-full rounded-lg border bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                      errors.adminPassword ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100" : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
                    }`}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.adminPassword && <p className="mt-1 text-xs font-medium text-rose-600">{errors.adminPassword}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Plan & Limits */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="AI Engine Provider" name="aiProvider" value={formData.aiProvider} onChange={handleChange} options={AI_OPTIONS} />
              <SelectField label="Subscription Plan" name="subscriptionPlan" value={formData.subscriptionPlan} onChange={handleChange} options={PLAN_OPTIONS} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Student Limit" name="studentLimit" type="number" value={formData.studentLimit} onChange={handleChange} />
              <InputField label="Teacher Limit" name="teacherLimit" type="number" value={formData.teacherLimit} onChange={handleChange} />
            </div>
          </div>
        )}

        {/* Step 4: Review & Create */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2 text-xs">
              <p className="flex justify-between"><span className="text-slate-500">School</span><span className="font-semibold text-slate-800">{formData.schoolName || "-"}</span></p>
              <p className="flex justify-between"><span className="text-slate-500">Contact Email</span><span className="font-semibold text-slate-800">{formData.email || "-"}</span></p>
              <p className="flex justify-between"><span className="text-slate-500">Admin Login</span><span className="font-semibold text-slate-800">{formData.adminEmail || formData.email || "-"}</span></p>
              <p className="flex justify-between"><span className="text-slate-500">Plan</span><span className="font-semibold text-slate-800">{formData.subscriptionPlan}</span></p>
              <p className="flex justify-between"><span className="text-slate-500">AI Provider</span><span className="font-semibold text-slate-800">{formData.aiProvider === "gemini" ? "Google Gemini" : "Anthropic Claude"}</span></p>
              <p className="flex justify-between"><span className="text-slate-500">Limits</span><span className="font-semibold text-slate-800">{formData.studentLimit} students / {formData.teacherLimit} teachers</span></p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-1.5 text-xs text-emerald-900">
              <p className="font-semibold flex items-center gap-1.5"><CheckCircle2 size={14} /> Set up automatically once created:</p>
              <p>• A full Kindergarten through Grade 12 grade roster, ready to assign students and courses</p>
              <p>• An active subscription on the plan above</p>
              <p>• The Admin's login credentials, shown to you next so you can share them</p>
            </div>
            {saveError && <p className="text-xs font-medium text-rose-600">{saveError}</p>}
          </div>
        )}

        {/* Nav buttons */}
        <div className="flex justify-between gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={step === 0 ? onClose : handleBack}
            className="flex items-center gap-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {step === 0 ? "Cancel" : (<><ChevronLeft size={15} /> Back</>)}
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Next <ChevronRight size={15} />
            </button>
          ) : (
            <div className="w-44">
              <PrimaryButton type="button" onClick={handleCreate} loading={saving}>
                Create School
              </PrimaryButton>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
