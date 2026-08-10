import { GraduationCap } from "lucide-react";

export default function Logo({ size = "md", showText = true }) {
  const sizes = {
    sm: { box: "h-7 w-7", icon: 14, text: "text-sm" },
    md: { box: "h-9 w-9", icon: 18, text: "text-base" },
    lg: { box: "h-12 w-12", icon: 24, text: "text-xl" },
  };
  const s = sizes[size];

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`flex ${s.box} items-center justify-center rounded-xl bg-indigo-600 shadow-sm shadow-indigo-200`}
      >
        <GraduationCap size={s.icon} className="text-white" strokeWidth={2.25} />
      </div>
      {showText && (
        <span className={`${s.text} font-semibold tracking-tight text-slate-900`}>
          AI Learning Suite
        </span>
      )}
    </div>
  );
}