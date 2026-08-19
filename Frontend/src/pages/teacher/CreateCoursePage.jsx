import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Sparkles, ArrowLeft } from "lucide-react";
import InputField from "../../components/ui/InputField";
import SelectField from "../../components/ui/SelectField";
import TextAreaField from "../../components/ui/TextAreaField";
import PrimaryButton from "../../components/ui/PrimaryButton";
import { useCourses } from "../../context/CourseContext";

const SUBJECT_OPTIONS = [
  "Mathematics", "Science", "English", "History", "Physics", "Chemistry", "Biology", "Computer Science", "Art", "Music",
].map((s) => ({ value: s, label: s }));

const GRADE_OPTIONS = [
  "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12",
].map((g) => ({ value: g, label: g }));

const EMPTY_FORM = {
  name: "",
  grade: GRADE_OPTIONS[4].value,
  subject: SUBJECT_OPTIONS[0].value,
  description: "",
};

export default function CreateCoursePage() {
  const { courseId } = useParams();
  const isEditMode = Boolean(courseId);
  const navigate = useNavigate();
  const { getCourseById, addCourse, updateCourse } = useCourses();

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [savingAs, setSavingAs] = useState(null);

  useEffect(() => {
    if (isEditMode) {
      const existing = getCourseById(courseId);
      if (existing) {
        setFormData({
          name: existing.name,
          grade: existing.grade,
          subject: existing.subject,
          description: existing.description,
        });
      }
    }
  }, [courseId]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function validate() {
    const errs = {};
    if (!formData.name.trim()) errs.name = "Course name is required";
    if (!formData.description.trim()) errs.description = "A short description helps students understand the course";
    return errs;
  }

  function handleOpenAIBuilder() {
    navigate("/teacher/ai-course-builder", {
      state: {
        courseName: formData.name,
        grade: formData.grade,
        subject: formData.subject,
      },
    });
  }

  async function persist(status) {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSavingAs(status);
    try {
      if (isEditMode) {
        updateCourse(courseId, { ...formData, status });
      } else {
        await addCourse({ ...formData, status });
      }
      navigate("/teacher/courses");
    } finally {
      setSavingAs(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          to="/teacher/courses"
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={15} />
          Back to My Courses
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">{isEditMode ? "Edit Course" : "Create Course"}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isEditMode ? "Update your course details below." : "Fill in the details to create a new course for your students."}
        </p>
      </div>

      <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <InputField
          label="Course Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          placeholder="e.g. Algebra Foundations"
        />

        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Grade" name="grade" value={formData.grade} onChange={handleChange} options={GRADE_OPTIONS} />
          <SelectField label="Subject" name="subject" value={formData.subject} onChange={handleChange} options={SUBJECT_OPTIONS} />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="description" className="block text-sm font-medium text-slate-700">
              Description
            </label>
            <button
              type="button"
              onClick={handleOpenAIBuilder}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              <Sparkles size={14} />
              Generate with AI
            </button>
          </div>
          <TextAreaField
            name="description"
            value={formData.description}
            onChange={handleChange}
            error={errors.description}
            placeholder="Describe what students will learn in this course, or use Generate with AI to build a full course outline..."
            rows={6}
          />
          <p className="mt-1.5 text-xs text-slate-400">
            "Generate with AI" opens the full AI Course Builder, where you can generate modules, lessons, and activities — not just a description.
          </p>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <div className="sm:w-44">
          <PrimaryButton
            variant="outline"
            onClick={() => persist("draft")}
            loading={savingAs === "draft"}
            disabled={savingAs === "published"}
          >
            Save Draft
          </PrimaryButton>
        </div>
        <div className="sm:w-44">
          <PrimaryButton onClick={() => persist("published")} loading={savingAs === "published"} disabled={savingAs === "draft"}>
            Publish
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}