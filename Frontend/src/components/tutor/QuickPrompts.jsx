import { BookOpenCheck, FileText, Lightbulb, ClipboardList, Sparkles, Languages } from "lucide-react";

const TUTOR_PROMPTS = [
  { id: "1", label: "Explain a concept", icon: "Lightbulb", prompt: "Can you explain the key concept of this lesson simply?" },
  { id: "2", label: "Summarize lesson", icon: "FileText", prompt: "Summarize the main takeaways from this lesson." },
  { id: "3", label: "Practice quiz", icon: "BookOpenCheck", prompt: "Give me 3 practice questions to test my understanding." },
  { id: "4", label: "Study tips", icon: "Sparkles", prompt: "What is the best way to study and memorize this material?" },
];

const ICONS = { BookOpenCheck, FileText, Lightbulb, ClipboardList, Sparkles, Languages };

export default function QuickPrompts({ onSelect, isDark, disabled }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {TUTOR_PROMPTS.map((item) => {
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