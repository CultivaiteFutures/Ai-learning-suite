import { useState } from "react";
import { Mail } from "lucide-react";
import InputField from "../ui/InputField";
import PasswordField from "../ui/PasswordField";
import PrimaryButton from "../ui/PrimaryButton";
import { validateLoginForm } from "../../utils/validators";

export default function LoginForm({ onSubmit, isSubmitting, serverError }) {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [remember, setRemember] = useState(true);

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