import { useState, useEffect, useMemo } from "react";
import { Eye, EyeOff, Search } from "lucide-react";
import Modal from "../ui/Modal";
import InputField from "../ui/InputField";
import PrimaryButton from "../ui/PrimaryButton";
import { schoolAdminAPI } from "../../services/api";

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  studentIds: [],
};

export default function ParentFormModal({ isOpen, onClose, onSave, initialData, serverError }) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.name || initialData.fullName || "",
          email: initialData.email || "",
          password: "",
          studentIds: (initialData.children || []).map((c) => c.id),
        });
      } else {
        setFormData(EMPTY_FORM);
      }
      setErrors({});
      setShowPassword(false);
      setStudentSearch("");
      schoolAdminAPI
        .getStudents()
        .then((res) => setStudents(Array.isArray(res.data) ? res.data : []))
        .catch(() => setStudents([]));
    }
  }, [isOpen, initialData]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function toggleStudent(studentId) {
    setFormData((prev) => {
      const alreadySelected = prev.studentIds.includes(studentId);
      return {
        ...prev,
        studentIds: alreadySelected
          ? prev.studentIds.filter((id) => id !== studentId)
          : [...prev.studentIds, studentId],
      };
    });
  }

  const filteredStudents = useMemo(() => {
    const term = studentSearch.trim().toLowerCase();
    if (!term) return students;
    return students.filter(
      (s) =>
        (s.name || "").toLowerCase().includes(term) ||
        (s.email || "").toLowerCase().includes(term) ||
        (s.gradeName || "").toLowerCase().includes(term)
    );
  }, [students, studentSearch]);

  function validate() {
    const errs = {};
    if (!formData.name.trim()) errs.name = "Name is required";
    if (!formData.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = "Enter a valid email";

    if (formData.password && formData.password.trim().length < 6) {
      errs.password = "Password must be at least 6 characters";
    }
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    setTimeout(() => {
      onSave(formData);
      setSaving(false);
    }, 300);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Parent/Guardian" : "Add Parent/Guardian"} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">
            {serverError}
          </div>
        )}
        <InputField label="Full Name *" name="name" value={formData.name} onChange={handleChange} error={errors.name} placeholder="e.g. Maria Gonzalez" />
        <InputField label="Email Address *" name="email" type="email" value={formData.email} onChange={handleChange} error={errors.email} placeholder="parent@example.com" />

        {!initialData && (
          <div>
            <div className="mb-1.5">
              <label className="text-sm font-medium text-slate-700">Password (leave blank to auto-generate)</label>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                placeholder="Leave blank for a server-generated password"
                className={`w-full rounded-lg border bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  errors.password
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
                    : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs font-medium text-rose-600">{errors.password}</p>}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Linked Children ({formData.studentIds.length} selected)
          </label>
          <div className="relative mb-2">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Search students by name, email, or grade..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-200">
            {filteredStudents.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-slate-400">No students match your search.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <label
                    key={student.id}
                    className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={formData.studentIds.includes(student.id)}
                      onChange={() => toggleStudent(student.id)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-800">{student.name}</p>
                      <p className="truncate text-xs text-slate-400">
                        {student.email}
                        {student.gradeName ? ` · ${student.gradeName}` : ""}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <div className="w-36">
            <PrimaryButton type="submit" loading={saving}>
              {initialData ? "Save Changes" : "Add Parent"}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </Modal>
  );
}
