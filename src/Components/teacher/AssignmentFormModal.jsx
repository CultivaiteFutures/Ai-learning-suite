import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import InputField from "../ui/InputField";
import SelectField from "../ui/SelectField";
import PrimaryButton from "../ui/PrimaryButton";
import { useCourses } from "../../context/CourseContext";

const TYPE_OPTIONS = ["Quiz", "Homework", "Project"].map((t) => ({ value: t, label: t }));
const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "grading", label: "Grading" },
  { value: "closed", label: "Closed" },
];

function buildEmptyForm(lockCourseId) {
  return {
    title: "",
    type: TYPE_OPTIONS[0].value,
    dueDate: new Date().toISOString().slice(0, 10),
    totalStudents: "",
    status: "open",
    courseId: lockCourseId || "",
  };
}

export default function AssignmentFormModal({ isOpen, onClose, onSave, initialData, lockCourseId }) {
  const { courses } = useCourses();
  const [formData, setFormData] = useState(buildEmptyForm(lockCourseId));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const courseOptions = courses.map((c) => ({ value: c.id, label: c.name }));

  useEffect(() => {
    if (isOpen) {
      setFormData(
        initialData
          ? { ...initialData, totalStudents: String(initialData.totalStudents) }
          : buildEmptyForm(lockCourseId)
      );
      setErrors({});
    }
  }, [isOpen, initialData, lockCourseId]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function validate() {
    const errs = {};
    if (!formData.title.trim()) errs.title = "Title is required";
    if (!lockCourseId && !formData.courseId) errs.courseId = "Select a course";
    if (!formData.totalStudents || isNaN(Number(formData.totalStudents))) errs.totalStudents = "Enter a valid number";
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    setTimeout(() => {
      onSave({
        ...formData,
        totalStudents: Number(formData.totalStudents),
        courseId: lockCourseId || formData.courseId,
      });
      setSaving(false);
    }, 400);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Assignment" : "Add Assignment"} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField
          label="Title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          error={errors.title}
          placeholder="e.g. Linear Equations Quiz"
        />

        {!lockCourseId && (
          <SelectField
            label="Course"
            name="courseId"
            value={formData.courseId}
            onChange={handleChange}
            options={[{ value: "", label: "Select a course" }, ...courseOptions]}
            error={errors.courseId}
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Type" name="type" value={formData.type} onChange={handleChange} options={TYPE_OPTIONS} />
          <InputField label="Due Date" name="dueDate" type="date" value={formData.dueDate} onChange={handleChange} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Total Students"
            name="totalStudents"
            type="number"
            value={formData.totalStudents}
            onChange={handleChange}
            error={errors.totalStudents}
            placeholder="e.g. 42"
          />
          <SelectField label="Status" name="status" value={formData.status} onChange={handleChange} options={STATUS_OPTIONS} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <div className="w-36">
            <PrimaryButton type="submit" loading={saving}>
              {initialData ? "Save Changes" : "Add Assignment"}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </Modal>
  );
}