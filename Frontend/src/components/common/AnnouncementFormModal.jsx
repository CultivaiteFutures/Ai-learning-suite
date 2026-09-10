import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import InputField from "../ui/InputField";
import TextAreaField from "../ui/TextAreaField";
import SelectField from "../ui/SelectField";
import PrimaryButton from "../ui/PrimaryButton";

/**
 * Shared create form for a school-wide or course-scoped announcement.
 * Used by both the Teacher and School Admin Announcements pages -- the
 * only difference between the two is whether "School-wide" is offered
 * as an audience option (Teachers must always pick one of their courses).
 */
export default function AnnouncementFormModal({ isOpen, onClose, onSave, courses = [], allowSchoolWide = false, saving = false }) {
  const [formData, setFormData] = useState({ title: "", content: "", courseId: "" });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setFormData({ title: "", content: "", courseId: allowSchoolWide ? "" : (courses[0]?.id || "") });
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
    if (!formData.content.trim()) next.content = "Content is required";
    if (!allowSchoolWide && !formData.courseId) next.courseId = "Select a course";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      title: formData.title.trim(),
      content: formData.content.trim(),
      courseId: formData.courseId || null,
    });
  }

  const courseOptions = [
    ...(allowSchoolWide ? [{ value: "", label: "School-wide (all students)" }] : []),
    ...courses.map((c) => ({ value: c.id, label: c.title || c.name || "Untitled course" })),
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Announcement">
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField
          label="Title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="e.g. Midterm exam schedule"
          error={errors.title}
        />
        <TextAreaField
          label="Content"
          name="content"
          value={formData.content}
          onChange={handleChange}
          placeholder="Write the announcement..."
          rows={5}
          error={errors.content}
        />
        <SelectField
          label={allowSchoolWide ? "Audience" : "Course"}
          name="courseId"
          value={formData.courseId}
          onChange={handleChange}
          options={courseOptions.length ? courseOptions : [{ value: "", label: "No courses available" }]}
          error={errors.courseId}
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
              Post
            </PrimaryButton>
          </div>
        </div>
      </form>
    </Modal>
  );
}
