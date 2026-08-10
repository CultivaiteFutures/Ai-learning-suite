import { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";

export default function PasswordField({
  label = "Password",
  name = "password",
  value,
  onChange,
  onBlur,
  placeholder = "Enter your password",
  error,
  autoComplete = "current-password",
  disabled = false,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={name}
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
          <Lock size={18} />
        </div>
        <input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className={`
            w-full rounded-lg border bg-white text-sm text-slate-900
            placeholder:text-slate-400
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-offset-0
            disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400
            py-2.5 pl-10 pr-10
            ${
              error
                ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
                : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
            }
          `}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}