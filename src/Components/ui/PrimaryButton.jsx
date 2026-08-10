export default function PrimaryButton({
  children,
  type = "button",
  onClick,
  disabled = false,
  loading = false,
  fullWidth = true,
  variant = "primary",
}) {
  const variants = {
    primary:
      "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-200 disabled:bg-indigo-300",
    outline:
      "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-200 disabled:text-slate-300",
    danger:
      "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-200 disabled:bg-rose-300",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 rounded-lg
        px-4 py-2.5 text-sm font-semibold
        transition-colors duration-150
        focus:outline-none focus:ring-4
        disabled:cursor-not-allowed
        ${fullWidth ? "w-full" : ""}
        ${variants[variant]}
      `}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      )}
      {children}
    </button>
  );
}