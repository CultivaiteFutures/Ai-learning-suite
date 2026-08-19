import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import LoginForm from "../../components/auth/LoginForm";
import { authService } from "../../services/authService";
import { useAuth } from "../../hooks/useAuth";

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
    </AuthLayout>
  );
}