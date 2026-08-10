export default function LoadingState({ rows = 6, columns = 5 }) {
  return (
    <div className="overflow-hidden rounded-b-xl bg-white">
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-6 px-4 py-4">
            {Array.from({ length: columns }).map((_, c) => (
              <div
                key={c}
                className="h-3.5 flex-1 animate-pulse rounded bg-slate-100"
                style={{ animationDelay: `${(r + c) * 40}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}