import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  BarChart3,
  Settings,
  Award,
  PlusCircle,
  Sparkles,
  Bot,
  Dumbbell,
  Trophy,
  User,
  ClipboardList,
  Building2, CreditCard,
   Activity,
  GraduationCap as LogoIcon,
  X,
} from "lucide-react";
import { NAVIGATION_CONFIG } from "../../config/navigation";
import { useAuth } from "../../hooks/useAuth";

const ICONS = {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  BarChart3,
  Settings,
  Award,
  PlusCircle,
  Sparkles,
  Bot,
  Dumbbell,
  Trophy,
  User,
  ClipboardList,Building2, CreditCard, Activity
};

export default function Sidebar({ isOpen, onClose }) {
  const { role, user } = useAuth();
  const navItems = NAVIGATION_CONFIG[role] ?? [];

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 shrink-0 bg-white border-r border-slate-200
          flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
        `}
      >
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <LogoIcon size={18} className="text-white" strokeWidth={2.25} />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-slate-900">AI Learning Suite</span>
          </div>
          <button onClick={onClose} className="lg:hidden rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {user?.schoolName && (
          <div className="px-5 pt-4 pb-2">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">School</p>
            <p className="truncate text-sm font-medium text-slate-700">{user.schoolName}</p>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path.split("/").length <= 2}
                onClick={onClose}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                  ${isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`
                }
              >
                {({ isActive }) => (
                  <>
                    {Icon && (
                      <Icon
                        size={18}
                        strokeWidth={2}
                        className={isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"}
                      />
                    )}
                    {item.label}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} AI Learning Suite</p>
        </div>
      </aside>
    </>
  );
}