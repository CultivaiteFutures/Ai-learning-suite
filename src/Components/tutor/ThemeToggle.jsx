import { Sun, Moon } from "lucide-react";

export default function ThemeToggle({ isDark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`
        flex h-9 w-9 items-center justify-center rounded-lg border transition-colors
        ${isDark ? "border-slate-700 bg-slate-800 text-amber-300 hover:bg-slate-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}
      `}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}