import { useState } from "react";
import { User, Lock, KeyRound, CheckCircle2, AlertCircle, Save } from "lucide-react";
import InputField from "../../components/ui/InputField";
import { useAuth } from "../../hooks/useAuth";
import { teacherAPI } from "../../services/api";

export default function TeacherSettingsPage() {
  const { user } = useAuth();
  const [profileForm, setProfileForm] = useState({
    fullName: user?.name || user?.full_name || "Teacher",
    email: user?.email || "teacher@school.edu",
    subject: "Physics & Computer Science",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  function showSuccess(msg) {
    setSuccessMsg(msg);
    setErrorMsg("");
    setTimeout(() => setSuccessMsg(""), 4000);
  }

  function showError(msg) {
    setErrorMsg(msg);
    setSuccessMsg("");
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await teacherAPI.updateProfile({
        fullName: profileForm.fullName,
        email: profileForm.email,
      });
      showSuccess("Teacher profile updated successfully.");
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
      await teacherAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      showSuccess("Password updated successfully.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      showError(err.response?.data?.detail || "Failed to update password. Please check your current password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Teacher Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your teacher profile, subject information, and account security.</p>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Profile */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-semibold">
            <User size={18} className="text-indigo-600" />
            <h2>Faculty Profile</h2>
          </div>
          <p className="text-xs text-slate-500">Update your teacher credentials.</p>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <InputField
              label="Full Name"
              value={profileForm.fullName}
              onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
              required
            />
            <InputField
              label="Teacher Email"
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
              type="email"
              required
            />
            <InputField
              label="Primary Teaching Subjects"
              value={profileForm.subject}
              onChange={(e) => setProfileForm({ ...profileForm, subject: e.target.value })}
            />
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save size={14} />
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-semibold">
            <Lock size={18} className="text-indigo-600" />
            <h2>Security & Password</h2>
          </div>
          <p className="text-xs text-slate-500">Change your teacher portal password.</p>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <InputField
              label="Current Password"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              required
            />
            <InputField
              label="New Password"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              required
            />
            <InputField
              label="Confirm New Password"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              required
            />
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                <KeyRound size={14} />
                {saving ? "Updating..." : "Change Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
