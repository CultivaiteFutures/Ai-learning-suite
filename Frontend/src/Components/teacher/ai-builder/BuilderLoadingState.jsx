export default function BuilderLoadingState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-5 h-10 w-10 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600" />
      <h3 className="text-sm font-semibold text-slate-800">Generating your course with AI...</h3>
      <p className="mt-1.5 max-w-xs text-sm text-slate-500">
        Structuring modules, lessons, and activities. This usually takes a few seconds.
      </p>

      <div className="mt-8 w-full max-w-sm space-y-3">
        {[100, 85, 92, 70].map((w, i) => (
          <div
            key={i}
            className="h-3 animate-pulse rounded bg-slate-100"
            style={{ width: `${w}%`, animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
    </div>
  );
}