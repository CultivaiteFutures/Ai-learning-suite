import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Sparkles,
  BookOpen,
  GraduationCap,
  Users,
  MessageSquare,
  BarChart3,
  ShieldCheck,
  Award,
  CalendarDays,
  ClipboardCheck,
  Bot,
  ArrowRight,
  CheckCircle2,
  Gamepad2,
  ListChecks,
  Building2,
  Menu,
  X,
} from "lucide-react";
import Logo from "../../components/common/Logo";
import { useAuth } from "../../hooks/useAuth";
import { ROLE_HOME } from "../../config/navigation";

const FEATURES = [
  { icon: Sparkles, title: "AI Course Builder", description: "Generate a full course outline, lessons, and quizzes from a topic or an uploaded PDF in minutes." },
  { icon: Bot, title: "AI Tutor", description: "Students get a context-aware AI tutor for every course, grounded in their real curriculum." },
  { icon: ClipboardCheck, title: "Auto-Graded Quizzes & Rubrics", description: "Quiz assignments grade themselves; open-ended work grades against a rubric with consistent criteria." },
  { icon: Gamepad2, title: "Gamified Learning", description: "XP, streaks, badges, school-wide challenges, and fun games keep students coming back." },
  { icon: Users, title: "Every Role, One Platform", description: "Purpose-built dashboards for Super Admin, School Admin, Teacher, Student, and Parent." },
  { icon: CalendarDays, title: "Attendance & Academic Calendar", description: "Per-course attendance tracking and a shared calendar with exam dates, deadlines, and holidays." },
  { icon: MessageSquare, title: "Built-in Messaging", description: "Direct 1:1 messaging between teachers, students, and parents -- no outside email required." },
  { icon: BarChart3, title: "Real Analytics & Report Cards", description: "Live progress analytics for teachers, and one-click PDF report cards for every student." },
  { icon: Building2, title: "Multi-School Management", description: "A Super Admin console to onboard schools, manage subscriptions, and track AI usage and cost." },
  { icon: ShieldCheck, title: "Privacy, Audit Trail & SSO", description: "School-scoped data isolation, a full audit log, data export/deletion tooling, and SSO scaffolding." },
];

const ROLES = [
  {
    role: "Administrators",
    icon: Building2,
    points: [
      "Bulk-import rosters via CSV/Excel in seconds",
      "School-scoped audit trail of every account and grade change",
      "AI usage & cost visibility, guided onboarding for new schools",
    ],
  },
  {
    role: "Teachers",
    icon: GraduationCap,
    points: [
      "Build a course with AI, then refine it by hand",
      "Grade with rubrics; AI assistant drafts feedback",
      "See real analytics on class and individual progress",
    ],
  },
  {
    role: "Students",
    icon: BookOpen,
    points: [
      "A tutor that knows exactly which course and unit you're in",
      "AI self-check before submitting homework",
      "Earn XP, keep a streak, and compete in challenges",
    ],
  },
  {
    role: "Parents",
    icon: Users,
    points: [
      "See every linked child's grades, attendance, and announcements",
      "Message your child's teacher directly",
      "Download the same report card the school generates",
    ],
  },
];

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        <Icon size={20} strokeWidth={2} />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{description}</p>
    </div>
  );
}

export default function LandingPage() {
  const { isAuthenticated, role } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeRole, setActiveRole] = useState(0);

  // Someone already signed in who lands on "/" (e.g. a bookmark) should go
  // straight to their dashboard rather than see a marketing page again.
  if (isAuthenticated) {
    return <Navigate to={ROLE_HOME[role] ?? "/login"} replace />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Logo size="sm" />

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900">Features</a>
            <a href="#roles" className="text-sm font-medium text-slate-600 hover:text-slate-900">Who it's for</a>
            <Link to="/privacy-policy" className="text-sm font-medium text-slate-600 hover:text-slate-900">Privacy</Link>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/login"
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              Sign In
            </Link>
          </div>

          <button onClick={() => setMenuOpen((v) => !v)} className="rounded-md p-2 text-slate-600 md:hidden">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-100 px-6 py-4 md:hidden">
            <div className="flex flex-col gap-4">
              <a href="#features" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-slate-600">Features</a>
              <a href="#roles" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-slate-600">Who it's for</a>
              <Link to="/privacy-policy" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-slate-600">Privacy</Link>
              <Link
                to="/login"
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-center text-sm font-semibold text-white"
              >
                Sign In
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-50 via-white to-white" />
        <div className="mx-auto max-w-5xl px-6 pb-20 pt-20 text-center sm:pt-28">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700">
            <Sparkles size={13} /> AI built into every role, not bolted on
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            One platform for your entire school
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-500 sm:text-lg">
            Course creation, grading, attendance, communication, and AI tutoring for Administrators, Teachers,
            Students, and Parents -- all in one secure, multi-tenant workspace built for K-12 education.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/login"
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700"
            >
              Sign In <ArrowRight size={16} />
            </Link>
            <a
              href="#features"
              className="rounded-lg border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Explore Features
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Everything a school needs, built in</h2>
          <p className="mt-3 text-sm text-slate-500 sm:text-base">
            No separate tools to stitch together -- course delivery, grading, communication, and administration
            live in one place.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* Role-based value props */}
      <section id="roles" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Built around how each role actually works</h2>
            <p className="mt-3 text-sm text-slate-500 sm:text-base">Every dashboard is designed for the person using it, not a generic shell.</p>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {ROLES.map((r, i) => (
              <button
                key={r.role}
                onClick={() => setActiveRole(i)}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  activeRole === i
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                <r.icon size={15} /> {r.role}
              </button>
            ))}
          </div>

          <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              {(() => {
                const Icon = ROLES[activeRole].icon;
                return <Icon size={20} className="text-indigo-600" />;
              })()}
              For {ROLES[activeRole].role}
            </h3>
            <ul className="mt-4 space-y-3">
              {ROLES[activeRole].points.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 px-8 py-14 sm:px-16">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to get started?</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-indigo-100 sm:text-base">
            Sign in with the account your school administrator set up for you.
          </p>
          <Link
            to="/login"
            className="mt-7 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50"
          >
            Sign In <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <Logo size="sm" />
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-400">
            <span>© {new Date().getFullYear()} AI Learning Suite</span>
            <Link to="/privacy-policy" className="hover:text-slate-600 hover:underline">Privacy Policy</Link>
            <Link to="/terms-of-service" className="hover:text-slate-600 hover:underline">Terms of Service</Link>
            <Link to="/dpa" className="hover:text-slate-600 hover:underline">DPA</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
