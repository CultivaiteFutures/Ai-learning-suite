import { BookOpenCheck, FileText, Lightbulb, ClipboardList, Sparkles, Languages, Bot } from "lucide-react";
import mockTutorPrompts from "../../data/mockTutorPrompts.json";

const ICONS = { BookOpenCheck, FileText, Lightbulb, ClipboardList, Sparkles, Languages };

export default function SuggestedQuestions({ onSelect, isDark }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
      <div
        className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${
          isDark ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600"
        }`}
      >
        <Bot size={26} />
      </div>
      <h2 className={`text-lg font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>How can I help you learn today?</h2>
      <p className={`mt-1.5 max-w-sm text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
        Ask about any lesson, or try one of these to get started.
      </p>

      <div className="mt-8 grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
        {mockTutorPrompts.map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.prompt)}
              className={`
                flex items-start gap-3 rounded-xl border p-4 text-left transition-colors
                ${
                  isDark
                    ? "border-slate-700 bg-slate-800/60 hover:bg-slate-800"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }
              `}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  isDark ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600"
                }`}
              >
                {Icon && <Icon size={16} />}
              </div>
              <div>
                <p className={`text-sm font-medium ${isDark ? "text-slate-100" : "text-slate-800"}`}>{item.label}</p>
                <p className={`mt-0.5 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{item.prompt}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}