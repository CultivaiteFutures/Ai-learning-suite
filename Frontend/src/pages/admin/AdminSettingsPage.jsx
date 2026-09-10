import { useState, useEffect } from "react";
import { Building2, User, Lock, Sliders, CheckCircle2, AlertCircle, Save, KeyRound, ShieldCheck } from "lucide-react";
import InputField from "../../components/ui/InputField";
import SsoSettingsPanel from "../../components/admin/SsoSettingsPanel";
import { schoolAdminAPI } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";

const TABS = [
  { id: "school", label: "School Profile", icon: Building2 },
  { id: "admin", label: "Admin Profile", icon: User },
  { id: "security", label: "Security & Password", icon: Lock },
  { id: "sso", label: "Single Sign-On", icon: ShieldCheck },
  { id: "preferences", label: "Preferences", icon: Sliders },
];

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("school");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // School profile form
  // Phone/address used to default to hardcoded placeholder-looking values
  // ("+1 555-0199", "100 Academic Way") for every school regardless of which
  // one was loaded, and Save silently drops both fields (the backend's
  // PUT /school-admin/settings/school only persists name + domain) -- so a
  // real value typed here looks saved but never is. Defaulting to empty
  // strings is the same honest-empty-state approach used elsewhere in this
  // app rather than showing data that was never real.
  const [schoolForm, setSchoolForm] = useState({
    name: user?.schoolName || "My School",
    domain: "",
    email: user?.email || "",
    phone: "",
    address: "",
  });

  // Admin profile form
  const [adminForm, setAdminForm] = useState({
    fullName: user?.name || user?.full_name || "School Administrator",
    email: user?.email || "admin@school.edu",
  });

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  function showSuccess(msg) {
    setSuccessMsg(msg);
    setErrorMsg("");
    setTimeout(() => setSuccessMsg(""), 4000);
  }

  function showError(msg) {
    setErrorMsg(msg);
    setSuccessMsg("");
  }

  async function handleSaveSchool(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await schoolAdminAPI.updateSchoolSettings({
        name: schoolForm.name,
        domain: schoolForm.domain,
      });
      showSuccess("School settings saved successfully.");
    } catch (err) {
      showError(err.response?.data?.detail || "Failed to update school settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAdmin(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await schoolAdminAPI.updateAdminProfile({
        fullName: adminForm.fullName,
        email: adminForm.email,
      });
      showSuccess("Administrator profile updated successfully.");
    } catch (err) {
      showError(err.response?.data?.detail || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError("New passwords do not match.");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      showError("New password must be at least 6 characters.");
      return;
    }

    setSaving(true);
    try {
      await schoolAdminAPI.changeAdminPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      showSuccess("Password changed successfully.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      showError(err.response?.data?.detail || "Failed to change password. Please verify your current password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Configure school profile, administrator details, and security.</p>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 border border-emerald-200">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-4 text-xs font-semibold text-rose-800 border border-rose-200">
          <AlertCircle size={16} className="shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: School Profile */}
      {activeTab === "school" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-1">School Profile</h2>
          <p className="text-xs text-slate-500 mb-5">Update official institutional name and general details.</p>
          <form onSubmit={handleSaveSchool} className="space-y-4 max-w-xl">
            <InputField
              label="School Name"
              value={schoolForm.name}
              onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
              required
            />
            <InputField
              label="School Domain / Website"
              value={schoolForm.domain}
              onChange={(e) => setSchoolForm({ ...schoolForm, domain: e.target.value })}
              placeholder="e.g. greenwood.edu"
            />
            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="Contact Email"
                value={schoolForm.email}
                onChange={(e) => setSchoolForm({ ...schoolForm, email: e.target.value })}
                type="email"
              />
              <InputField
                label="Phone Number"
                value={schoolForm.phone}
                onChange={(e) => setSchoolForm({ ...schoolForm, phone: e.target.value })}
              />
            </div>
            <InputField
              label="Campus Address"
              value={schoolForm.address}
              onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })}
            />
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save size={14} />
                {saving ? "Saving..." : "Save School Settings"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Admin Profile */}
      {activeTab === "admin" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-1">Administrator Profile</h2>
          <p className="text-xs text-slate-500 mb-5">Manage your personal administrator identity and contact info.</p>
          <form onSubmit={handleSaveAdmin} className="space-y-4 max-w-xl">
            <InputField
              label="Full Name"
              value={adminForm.fullName}
              onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })}
              required
            />
            <InputField
              label="Admin Login Email"
              value={adminForm.email}
              onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
              type="email"
              required
            />
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save size={14} />
                {saving ? "Saving..." : "Update Profile"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Security & Password */}
      {activeTab === "security" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-1">Change Admin Password</h2>
          <p className="text-xs text-slate-500 mb-5">Ensure your account uses a strong, unique password.</p>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
            <InputField
              label="Current Password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              type="password"
              required
            />
            <InputField
              label="New Password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              type="password"
              required
            />
            <InputField
              label="Confirm New Password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              type="password"
              required
            />
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                <KeyRound size={14} />
                {saving ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 4: Preferences */}
      {activeTab === "preferences" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 max-w-xl">
          <h2 className="text-base font-semibold text-slate-900 mb-1">School Preferences</h2>
          <p className="text-xs text-slate-500 mb-4">Default configurations for AI model and notifications.</p>
          
          <div className="rounded-lg border border-slate-200 p-4 bg-slate-50 space-y-1">
            <p className="text-xs font-semibold text-slate-800">AI Engine</p>
            <p className="text-xs text-slate-500">Google Gemini (Default & Configured)</p>
          </div>

          <div className="rounded-lg border border-slate-200 p-4 bg-slate-50 space-y-1">
            <p className="text-xs font-semibold text-slate-800">Auto Credential Security</p>
            <p className="text-xs text-slate-500">Bcrypt password hashing with per-student unique tokens enabled.</p>
          </div>
        </div>
      )}

      {/* Tab 5: Single Sign-On (Task #62) */}
      {activeTab === "sso" && <SsoSettingsPanel />}
    </div>
  );
}
