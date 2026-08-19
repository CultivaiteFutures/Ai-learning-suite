import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import CourseBuilderForm from "../../components/teacher/ai-builder/CourseBuilderForm";
import BuilderEmptyState from "../../components/teacher/ai-builder/BuilderEmptyState";
import BuilderLoadingState from "../../components/teacher/ai-builder/BuilderLoadingState";
import GeneratedCourseView from "../../components/teacher/ai-builder/GeneratedCourseView";
import FadeIn from "../../components/common/FadeIn";
import { generateCourseWithAI } from "../../services/aiCourseBuilderService";
import { useCourses } from "../../context/CourseContext";
import { useAuth } from "../../hooks/useAuth";

const DEFAULT_FORM = {
  courseName: "",
  grade: "Grade 10",
  subject: "Mathematics",
  language: "English",
  difficulty: "Intermediate",
  learningObjectives: "",
  numberOfModules: "4",
  lessonDuration: "45 minutes",
  additionalInstructions: "",
};

export default function AICourseBuilderPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { addCourse } = useCourses();
  const { user } = useAuth();

  const [formData, setFormData] = useState({ ...DEFAULT_FORM, ...(location.state || {}) });
  const [errors, setErrors] = useState({});
  const [generatedCourse, setGeneratedCourse] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  function handleFieldChange(name, value) {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function validate() {
    const errs = {};
    if (!formData.courseName.trim()) errs.courseName = "Course name is required";
    return errs;
  }

  async function handleGenerate() {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsGenerating(true);
    setGeneratedCourse(null);
    try {
      const result = await generateCourseWithAI(formData);
      setGeneratedCourse(result);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleRegenerate() {
    setIsRegenerating(true);
    try {
      const result = await generateCourseWithAI(formData);
      setGeneratedCourse(result);
    } finally {
      setIsRegenerating(false);
    }
  }

  function persist(status) {
    if (!generatedCourse) return;
    setIsSaving(true);
    setTimeout(() => {
      addCourse({
        name: generatedCourse.courseName,
        grade: generatedCourse.grade,
        subject: generatedCourse.subject,
        description: generatedCourse.overview,
        status,
        modules: generatedCourse.modules,
        school_id: user?.schoolId,
        teacher_id: user?.id,
        teacher_name: user?.name,
      });
      setIsSaving(false);
      navigate("/teacher/courses");
    }, 500);
  }

  const stateKey = isGenerating ? "loading" : generatedCourse ? "result" : "empty";

  return (
    <div className="flex h-[calc(100vh-11rem)] min-h-[500px] flex-col">
      <div className="mb-4 shrink-0">
        <Link to="/teacher/courses" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700">
          <ArrowLeft size={15} />
          Back to My Courses
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">AI Course Builder</h1>
        <p className="mt-1 text-sm text-slate-500">Describe the course you want, and let AI build the full outline.</p>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:flex-row">
        <div className="w-full shrink-0 border-b border-slate-200 lg:w-[380px] lg:border-b-0 lg:border-r">
          <CourseBuilderForm formData={formData} onChange={handleFieldChange} onGenerate={handleGenerate} isGenerating={isGenerating} errors={errors} />
        </div>

        <div className="flex-1 overflow-hidden bg-slate-50/50">
          <FadeIn watch={stateKey}>
            {isGenerating ? (
              <BuilderLoadingState />
            ) : generatedCourse ? (
              <GeneratedCourseView
                course={generatedCourse}
                onChange={setGeneratedCourse}
                onRegenerate={handleRegenerate}
                onSaveDraft={() => persist("draft")}
                onPublish={() => persist("published")}
                isRegenerating={isRegenerating}
                isSaving={isSaving}
              />
            ) : (
              <BuilderEmptyState />
            )}
          </FadeIn>
        </div>
      </div>
    </div>
  );
}