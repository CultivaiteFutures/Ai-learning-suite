import { Link } from "react-router-dom";
import Logo from "../components/common/Logo";

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Left: form panel */}
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm">
          <Logo size="md" />

          <div className="mt-10">
            {title && (
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                {title}
              </h1>
            )}
            {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
          </div>

          <div className="mt-8">{children}</div>

          <div className="mt-10 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
            <Link to="/privacy-policy" className="hover:text-slate-600 hover:underline">Privacy Policy</Link>
            <span>·</span>
            <Link to="/terms-of-service" className="hover:text-slate-600 hover:underline">Terms of Service</Link>
            <span>·</span>
            <Link to="/dpa" className="hover:text-slate-600 hover:underline">Data Processing Agreement</Link>
          </div>
        </div>
      </div>

      {/* Right: brand panel */}
      <div className="relative hidden w-1/2 items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 lg:flex">
        <div className="absolute inset-0 opacity-[0.07]">
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
              backgroundSize: "28px 28px",
            }}
          />
        </div>

        <div className="relative z-10 max-w-md px-10 text-center">
          <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.75"
            >
              <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5Z" />
              <path d="M6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-white">
            One platform for your entire school
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-indigo-100">
            Manage courses, track student progress, and deliver AI-powered
            learning experiences — all in one secure, multi-tenant workspace
            built for K-12 education.
          </p>
        </div>
      </div>
    </div>
  );
}