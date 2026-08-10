import { Search } from "lucide-react";
import { useState } from "react";

export default function SearchBar({ placeholder = "Search courses, students, quizzes...", onSearch }) {
  const [value, setValue] = useState("");

  function handleChange(e) {
    setValue(e.target.value);
    onSearch?.(e.target.value);
  }

  return (
    <div className="relative hidden w-full max-w-sm md:block">
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
        <Search size={16} />
      </div>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
      />
    </div>
  );
}