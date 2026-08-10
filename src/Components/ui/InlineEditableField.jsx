export default function InlineEditableField({
  value,
  onChange,
  as = "input",
  type = "text",
  placeholder,
  className = "",
  rows = 3,
}) {
  const baseClasses = `
    w-full bg-transparent border border-transparent rounded-md
    px-2 py-1 -mx-2
    text-slate-800 placeholder:text-slate-400
    transition-colors duration-150
    hover:border-slate-200
    focus:outline-none focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100
  `;

  if (as === "textarea") {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`${baseClasses} resize-none ${className}`}
      />
    );
  }

  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${baseClasses} ${className}`}
    />
  );
}