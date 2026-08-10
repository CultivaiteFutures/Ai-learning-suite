export default function SelectField({ label, name, value, onChange, options, error, disabled = false }) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`
          w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900
          focus:outline-none focus:ring-2 focus:ring-offset-0
          disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400
          ${
            error
              ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
              : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
          }
        `}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}