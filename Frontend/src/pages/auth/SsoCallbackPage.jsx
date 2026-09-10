import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import AuthLayout from "../../layouts/AuthLayout";
import { authAPI } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { ROLE_HOME } from "../../config/navigation";

/**
 * Task #62: lands here after app/api/v1/sso.py's callback redirects the
 * browser back with a real, freshly-issued JWT (?token=...) -- fetches the
 * user's own profile with it (same /auth/me route used elsewhere), then
 * hands off to the normal AuthContext login exactly like a password login
 * would, so nothing downstream needs to know SSO was involved at all.
 */
export default function SsoCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState("");
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const token = searchParams.get("token");
    if (!token) {
      setError("No sign-in token was received.");
      return;
    }

    // Set before the /auth/me call so the axios interceptor attaches it.
    localStorage.setItem("token", token);
    localStorage.setItem("ails_token", token);

    authAPI
      .getCurrentUser()
      .then((res) => {
        const user = { ...res.data, role: (res.data.role || "").toLowerCase() };
        login(user, token);
        navigate(ROLE_HOME[user.role] ?? "/login", { replace: true });
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("ails_token");
        setError("We couldn't complete your sign-in. Please try again.");
      });
  }, [searchParams, navigate, login]);

  return (
    <AuthLayout title="Signing you in" subtitle="One moment while we finish setting up your session.">
      {error ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
          <Link to="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            Back to sign in
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" /> Completing sign-in...
        </div>
      )}
    </AuthLayout>
  );
}
