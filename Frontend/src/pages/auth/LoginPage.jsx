import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import LoginForm from "../../components/auth/LoginForm";
import { authService } from "../../services/authService";
import { useAuth } from "../../hooks/useAuth";
import { ROLE_HOME } from "../../config/navigation";

const SSO_ERROR_MESSAGES = {
  access_denied: "Sign-in was cancelled.",
  invalid_request: "That sign-in link was invalid. Please try again.",
  invalid_or_expired_state: "That sign-in link expired. Please try again.",
  invalid_state: "That sign-in link was invalid. Please try again.",
  provider_not_configured: "Single sign-on isn't configured for your school right now.",
  token_exchange_failed: "We couldn't complete sign-in with that provider. Please try again.",
  provider_error: "We couldn't reach the sign-in provider. Please try again.",
  email_not_provided: "Your account with that provider didn't share an email address.",
  account_not_found: "No account was found for that email. Contact your school admin.",
  account_inactive: "This account is inactive. Contact your school admin.",
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    const ssoError = searchParams.get("ssoError");
    if (ssoError) {
      setServerError(SSO_ERROR_MESSAGES[ssoError] || "Single sign-on failed. Please try again or use your password.");
    }
  }, [searchParams]);

  async function handleLogin(formData) {
    setServerError("");
    setIsSubmitting(true);
    try {
      const { access_token, user } = await authService.login(formData.email, formData.password);
      login(user, access_token);
      navigate(ROLE_HOME[(user.role || "").toLowerCase()] ?? "/login", { replace: true });
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