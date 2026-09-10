import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import InputField from "../ui/InputField";
import TextAreaField from "../ui/TextAreaField";
import SelectField from "../ui/SelectField";
import PrimaryButton from "../ui/PrimaryButton";

const EVENT_TYPE_OPTIONS = [
  { value: "event", label: "Event" },
  { value: "holiday", label: "Holiday" },
  { value: "exam", label: "Exam" },
  { value: "deadline", label: "Deadline" },
];

/**
 * Shared create form for a school-wide or course-scoped calendar event.
 * Mirrors AnnouncementFormModal's pattern: Teachers must always pick one of
 * their courses (course-scoped only), Admin may also choose "School-wide".
 */
export default function CalendarEventFormModal({ isOpen, onClose, onSave, courses = [], allowSchoolWide = false, saving = false }) {
  const [formData, setFormData] = useState({ title: "", description: "", eventDate: "", eventType: "event", courseId: "" });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: "",
        description: "",
        eventDate: "",
        eventType: "event",
        courseId: allowSchoolWide ? "" : (courses[0]?.id || ""),
      });
      setErrors({});
    }
  }, [isOpen, allowSchoolWide, courses]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function validate() {
    const next = {};
    if (!formData.title.trim()) next.title = "Title is required";
    if (!formData.eventDate) next.eventDate = "Date is required";
    if (!allowSchoolWide && !formData.courseId) next.courseId = "Select a course";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      title: formData.title.trim(),
      description: formData.description.trim(),
      eventDate: new Date(formData.eventDate).toISOString(),
      eventType: formData.eventType,
      courseId: formData.courseId || null,
    });
  }

  const courseOptions = [
    ...(allowSchoolWide ? [{ value: "", label: "School-wide (all students)" }] : []),
    ...courses.map((c) => ({ value: c.id, label: c.title || c.name || "Untitled course" })),
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Calendar Event">
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField
          label="Title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="e.g. Midterm Exam"
          error={errors.title}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField
            label="Date & time"
            name="eventDate"
            type="datetime-local"
            value={formData.eventDate}
            onChange={handleChange}
            error={errors.eventDate}
          />
          <SelectField
            label="Type"
            name="eventType"
            value={formData.eventType}
            onChange={handleChange}
            options={EVENT_TYPE_OPTIONS}
          />
        </div>
        <SelectField
          label={allowSchoolWide ? "Audience" : "Course"}
          name="courseId"
          value={formData.courseId}
          onChange={handleChange}
          options={courseOptions.length ? courseOptions : [{ value: "", label: "No courses available" }]}
          error={errors.courseId}
        />
        <TextAreaField
          label="Description (optional)"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Add any extra details students should know..."
          rows={3}
        />
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
              Create
            </PrimaryButton>
          </div>
        </div>
      </form>
    </Modal>
  );
}
