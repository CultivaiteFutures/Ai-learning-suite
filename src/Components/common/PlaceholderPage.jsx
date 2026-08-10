import { Construction } from "lucide-react";

export default function PlaceholderPage({ title, description }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
        <Construction size={22} />
      </div>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm text-slate-500">
        {description || "This module is being built in an upcoming sprint."}
      </p>
    </div>
  );
}