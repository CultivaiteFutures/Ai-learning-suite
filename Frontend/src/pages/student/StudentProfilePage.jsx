import { useState, useEffect } from "react";
import { User, GraduationCap, Award, BookOpen, CheckCircle2, Lock, KeyRound, AlertCircle } from "lucide-react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import InputField from "../../components/ui/InputField";
import { studentAPI } from "../../services/api";
import PrivacyDataPanel from "../../components/common/PrivacyDataPanel";
import { useAuth } from "../../hooks/useAuth";

export default function StudentProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [savingPassword, setSavingPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    studentAPI.getProfile().then((res) => {
      if (res.data) setProfile(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleChangePassword(e) {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setErrorMsg("New passwords do not match.");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters.");
      return;
    }

    setSavingPassword(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await studentAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setSuccessMsg("Password changed successfully.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "Failed to update password. Please check your current password.");
    } finally {
      setSavingPassword(false);
    }
  }

  const u = profile?.user || {
    fullName: user?.name || user?.full_name || "Student",
    email: user?.email || "student@school.edu",
    studentId: `STU-${(user?.id || "001").slice(0, 6).toUpperCase()}`,
    grade: "Grade 10",
    section: "A",
    schoolName: user?.schoolName || "My School",
  };

  const a = profile?.academic || {
    enrolledCoursesCount: 0,
    completedLessonsCount: 0,
    totalAssignmentsCount: 0,
    completedAssignmentsCount: 0,
    averageScore: null,
    xp: 0,
    streakDays: 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Student Profile</h1>
        <p className="mt-1 text-sm text-slate-500">View personal information, academic statistics, and manage account security.</p>
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

      {/* Academic Highlights */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <DashboardCard label="Enrolled Courses" value={a.enrolledCoursesCount} icon={BookOpen} accent="indigo" />
        <DashboardCard label="Completed Lessons" value={a.completedLessonsCount} icon={CheckCircle2} accent="emerald" />
        <DashboardCard label="Assignments Finished" value={`${a.completedAssignmentsCount}/${a.totalAssignmentsCount}`} icon={Award} accent="purple" />
        <DashboardCard label="Average Grade" value={a.averageScore ? `${a.averageScore}%` : "—"} icon={GraduationCap} accent="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Personal & Academic Info Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-xl">
              {u.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{u.fullName}</h2>
              <p className="text-xs text-slate-500">Student ID: <span className="font-mono font-medium text-slate-700">{u.studentId}</span></p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-xs">
            <div>
              <p className="text-slate-400 font-medium uppercase">Login Username / Email</p>
              <p className="font-medium text-slate-800 mt-1">{u.email}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium uppercase">School Institution</p>
              <p className="font-medium text-slate-800 mt-1">{u.schoolName}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium uppercase">Grade Level</p>
              <p className="font-medium text-slate-800 mt-1">{u.grade}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium uppercase">Section</p>
              <p className="font-medium text-slate-800 mt-1">Section {u.section}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium uppercase">Experience Points (XP)</p>
              <p className="font-semibold text-indigo-600 mt-1">{a.xp} XP</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium uppercase">Learning Streak</p>
              <p className="font-semibold text-amber-600 mt-1">{a.streakDays} Days 🔥</p>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-semibold">
            <Lock size={18} className="text-indigo-600" />
            <h3>Change Password</h3>
          </div>
          <p className="text-xs text-slate-500">Update your student portal login password.</p>

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
            <button
              type="submit"
              disabled={savingPassword}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              <KeyRound size={14} />
              {savingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>

      <PrivacyDataPanel
        possessive="your"
        exportFn={studentAPI.exportMyData}
        exportFilename="my-data-export.json"
        requestDeletionFn={() => studentAPI.requestMyDeletion()}
      />
    </div>
  );
}
