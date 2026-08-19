import { Sparkles } from "lucide-react";

export default function BuilderEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-20 text-center">
      <svg width="180" height="140" viewBox="0 0 180 140" fill="none" className="mb-6">
        <rect x="30" y="30" width="90" height="70" rx="8" fill="#EEF2FF" />
        <rect x="45" y="45" width="60" height="6" rx="3" fill="#C7D2FE" />
        <rect x="45" y="58" width="45" height="6" rx="3" fill="#C7D2FE" />
        <rect x="45" y="71" width="50" height="6" rx="3" fill="#C7D2FE" />
        <circle cx="135" cy="40" r="22" fill="#4F46E5" opacity="0.1" />
        <path d="M135 28l3.5 8 8 3.5-8 3.5-3.5 8-3.5-8-8-3.5 8-3.5 3.5-8z" fill="#4F46E5" />
        <circle cx="45" cy="115" r="4" fill="#A5B4FC" />
        <circle cx="60" cy="120" r="2.5" fill="#C7D2FE" />
      </svg>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
        <Sparkles size={18} />
      </div>
      <h3 className="text-base font-semibold text-slate-800">Your AI-generated course will appear here.</h3>
      <p className="mt-1.5 max-w-sm text-sm text-slate-500">
        Fill in the details on the left and click "Generate Course" to build a full course outline in seconds.
      </p>
    </div>
  );
}