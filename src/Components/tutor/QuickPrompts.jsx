import { BookOpenCheck, FileText, Lightbulb, ClipboardList, Sparkles, Languages } from "lucide-react";
import mockTutorPrompts from "../../data/mockTutorPrompts.json";

const ICONS = { BookOpenCheck, FileText, Lightbulb, ClipboardList, Sparkles, Languages };

export default function QuickPrompts({ onSelect, isDark, disabled }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {mockTutorPrompts.map((item) => {
        const Icon = ICONS[item.icon];
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.prompt)}
            disabled={disabled}
            className={`
              flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium
              transition-colors disabled:cursor-not-allowed disabled:opacity-50
              ${
                isDark
                  ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }
            `}
          >
            {Icon && <Icon size={13} />}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}