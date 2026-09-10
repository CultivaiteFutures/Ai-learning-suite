import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Logo from "../../components/common/Logo";

/**
 * Shared chrome for the three standalone legal documents (Privacy Policy,
 * Terms of Service, Data Processing Agreement). Deliberately outside
 * DashboardLayout/AuthProvider's redirect logic -- these routes are public
 * so they're reachable from the login screen, a footer link while signed
 * in, or a link shared with a prospective school before they ever have an
 * account.
 */
export default function LegalDocumentLayout({ title, effectiveDate, children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-6 py-10 sm:px-8">
        <div className="mb-8 flex items-center justify-between">
          <Logo size="sm" />
          <Link to="/login" className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700">
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          {effectiveDate && <p className="mt-1 text-xs text-slate-400">Effective date: {effectiveDate}</p>}

          <div className="prose prose-sm prose-slate mt-6 max-w-none space-y-5 text-sm leading-relaxed text-slate-700">
            {children}
          </div>

          <div className="mt-10 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            This document is a starting template generated for this platform. It has not been reviewed by a lawyer
            and should be reviewed by qualified legal counsel, and adapted to your school's or organization's actual
            data practices and jurisdiction, before being relied on or published as binding.
          </div>
        </div>
      </div>
    </div>
  );
}
