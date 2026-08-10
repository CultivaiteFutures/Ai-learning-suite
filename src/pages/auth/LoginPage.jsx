import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import LoginForm from "../../components/auth/LoginForm";
import { authService } from "../../services/authService";
import { useAuth } from "../../hooks/useAuth";
import { DEMO_CREDENTIALS, MOCK_PASSWORD } from "../../data/mockUsers";

const ROLE_HOME = {
  super_admin: "/super-admin/dashboard",
  admin: "/admin/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  async function handleLogin(formData) {
    setServerError("");
    setIsSubmitting(true);
    try {
      const { access_token, user } = await authService.login(formData.email, formData.password);
      login(user, access_token);
      navigate(ROLE_HOME[user.role] ?? "/login", { replace: true });
    } catch (err) {
      setServerError(err.message || "Invalid email or password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to access your school's learning dashboard.">
      <LoginForm onSubmit={handleLogin} isSubmitting={isSubmitting} serverError={serverError} />

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Demo Accounts (Frontend-only mode)</p>
        <ul className="space-y-1">
          {DEMO_CREDENTIALS.map((cred) => (
            <li key={cred.role} className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-medium text-slate-700">{cred.role}</span>
              <span className="font-mono">{cred.email}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-400">
          Password: <span className="font-mono text-slate-600">{MOCK_PASSWORD}</span> (or any password, 4+ characters)
        </p>
      </div>
    </AuthLayout>
  );
}