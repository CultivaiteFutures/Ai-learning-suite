import { useState, useEffect, useRef } from "react";
import { Mail, Loader2 } from "lucide-react";
import InputField from "../ui/InputField";
import PasswordField from "../ui/PasswordField";
import PrimaryButton from "../ui/PrimaryButton";
import { validateLoginForm } from "../../utils/validators";
import { ssoAPI } from "../../services/api";

// Task #62: as the user types a work email whose domain has SSO configured
// (Google/Clever/ClassLink), a matching "Sign in with ..." button appears
// here -- debounced so it is not looked up on every keystroke, and quietly
// empty for every school that hasn't set SSO up (the common case today).
function useSsoProviders(email) {
  const [providers, setProviders] = useState([]);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const domain = email.includes("@") ? email.split("@")[1] : "";
    if (!domain || !domain.includes(".")) {
      setProviders([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      ssoAPI
        .lookupProviders(email)
        .then((res) => setProviders(res.data?.providers || []))
        .catch(() => setProviders([]));
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [email]);

  return providers;
}

export default function LoginForm({ onSubmit, isSubmitting, serverError }) {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [remember, setRemember] = useState(true);
  const [ssoLoadingProvider, setSsoLoadingProvider] = useState(null);
  const ssoProviders = useSsoProviders(formData.email);

  async function handleSsoClick(provider) {
    setSsoLoadingProvider(provider);
    try {
      const res = await ssoAPI.startLogin(provider, formData.email);
      window.location.href = res.data.authorization_url;
    } catch (err) {
      setSsoLoadingProvider(null);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validateLoginForm(formData);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) {
      onSubmit(formData, remember);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {serverError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {serverError}
        </div>
      )}

      <InputField
        label="Email address"
        name="email"
        type="email"
        placeholder="you@school.edu"
        value={formData.email}
        onChange={handleChange}
        error={errors.email}
        icon={Mail}
        autoComplete="email"
        disabled={isSubmitting}
      />

      {ssoProviders.length > 0 && (
        <div className="space-y-2">
          {ssoProviders.map((p) => (
            <button
              key={p.provider}
              type="button"
              onClick={() => handleSsoClick(p.provider)}
              disabled={ssoLoadingProvider !== null}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {ssoLoadingProvider === p.provider ? <Loader2 size={15} className="animate-spin" /> : null}
              Sign in with {p.label}
            </button>
          ))}
          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">or use your password</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
        </div>
      )}

      <PasswordField
        label="Password"
        name="password"
        value={formData.password}
        onChange={handleChange}
        error={errors.password}
        disabled={isSubmitting}
      />

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
          />
          Remember me
        </label>
        <a href="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          Forgot password?
        </a>
      </div>

      <PrimaryButton type="submit" loading={isSubmitting}>
        Sign in
      </PrimaryButton>

      <p className="text-center text-sm text-slate-500">
        Don&apos;t have a school account?{" "}
        <a href="#" className="font-medium text-indigo-600 hover:text-indigo-700">
          Contact your administrator
        </a>
      </p>
    </form>
  );
}