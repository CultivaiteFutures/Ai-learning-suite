export default function TypingIndicator({ isDark }) {
  const dotClass = isDark ? "bg-slate-500" : "bg-slate-400";
  return (
    <div className="flex items-center gap-1 px-1 py-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 animate-bounce rounded-full ${dotClass}`}
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}