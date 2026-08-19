import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Sparkles, FileUp, Rocket, Plus, Pencil, Trash2 } from "lucide-react";
import InputField from "../../components/ui/InputField";
import SelectField from "../../components/ui/SelectField";
import TextAreaField from "../../components/ui/TextAreaField";
import PrimaryButton from "../../components/ui/PrimaryButton";
import ModuleEditor from "../../components/teacher/ai-builder/ModuleEditor";
import AssignmentFormModal from "../../components/teacher/AssignmentFormModal";
import PDFUploadModal from "../../components/teacher/course-builder/PDFUploadModal";
import ConfirmationDialog from "../../components/common/ConfirmationDialog";
import DataTable from "../../components/table/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import { useCourses } from "../../context/CourseContext";
import { useAuth } from "../../hooks/useAuth";
import { generateCourseWithAI } from "../../services/aiCourseBuilderService";
import { generateCourseFromPDF } from "../../services/pdfCourseGenService";

const SUBJECT_OPTIONS = [
  "Mathematics", "Science", "English", "History", "Physics", "Chemistry", "Biology", "Computer Science", "Art", "Music",
].map((s) => ({ value: s, label: s }));

const GRADE_OPTIONS = [
  "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12",
].map((g) => ({ value: g, label: g }));

const TABS = ["Course Information", "Modules & Lessons", "Assignments", "Preview"];

export default function CourseBuilderPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    getCourseById, addCourse, updateCourse, publishCourse,
    addModule, updateModule, deleteModule, reorderModule,
    getAssignmentsByCourse, addAssignment, updateAssignment, deleteAssignment,
  } = useCourses();

  const [activeTab, setActiveTab] = useState("Course Information");
  const [aiLoading, setAiLoading] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [deleteAssignmentTarget, setDeleteAssignmentTarget] = useState(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!courseId) {
      addCourse({
        name: "Untitled Course",
        grade: GRADE_OPTIONS[0].value,
        subject: SUBJECT_OPTIONS[0].value,
        description: "",
        status: "draft",
        modules: [],
        school_id: user?.schoolId,
        teacher_id: user?.id,
        teacher_name: user?.name,
      }).then((draft) => {
        if (draft && draft.id) {
          navigate(`/teacher/courses/${draft.id}/edit`, { replace: true });
        }
      });
    }
  }, [courseId]);

  const course = courseId ? getCourseById(courseId) : null;

  if (!course) {
    return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Loading course builder...</div>;
  }

  function handleInfoChange(e) {
    const { name, value } = e.target;
    updateCourse(course.id, { [name]: value });
  }

  async function handleGenerateAI() {
    setAiLoading(true);
    try {
      const generated = await generateCourseWithAI({
        courseName: course.name,
        grade: course.grade,
        subject: course.subject,
        language: "English",
        difficulty: "Intermediate",
        learningObjectives: "",
        numberOfModules: "4",
        lessonDuration: "45 minutes",
        additionalInstructions: "",
      });
      updateCourse(course.id, { name: generated.courseName, description: generated.overview, modules: generated.modules });
      setActiveTab("Modules & Lessons");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleGenerateFromPDF(file) {
    setPdfLoading(true);
    try {
      const generated = await generateCourseFromPDF(file, {
        grade: course.grade,
        subject: course.subject,
      });
      updateCourse(course.id, {
        name: course.name === "Untitled Course" ? generated.courseName : course.name,
        description: generated.overview,
        modules: generated.modules,
      });
      setPdfModalOpen(false);
      setActiveTab("Modules & Lessons");
    } finally {
      setPdfLoading(false);
    }
  }

  function openCreateAssignment() {
    setEditingAssignment(null);
    setAssignmentModalOpen(true);
  }

  function openEditAssignment(a) {
    setEditingAssignment(a);
    setAssignmentModalOpen(true);
  }

  function handleSaveAssignment(data) {
    if (editingAssignment) updateAssignment(editingAssignment.id, data);
    else addAssignment({ ...data, courseId: course.id });
    setAssignmentModalOpen(false);
  }

  function confirmDeleteAssignment() {
    deleteAssignment(deleteAssignmentTarget.id);
    setDeleteAssignmentTarget(null);
  }

  function handlePublish() {
    setPublishing(true);
    setTimeout(() => {
      publishCourse(course.id);
      setPublishing(false);
      navigate("/teacher/courses");
    }, 500);
  }

  const assignments = getAssignmentsByCourse(course.id);
  const totalLessons = (course.modules || []).reduce((sum, m) => sum + (m.lessons?.length || 0), 0);

  const assignmentColumns = [
    { key: "title", label: "Title" },
    { key: "type", label: "Type", render: (row) => row.type || "Assignment" },
    { key: "dueDate", label: "Due Date" },
    { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status || "open"} /> },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEditAssignment(row)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600">
            <Pencil size={15} />
          </button>
          <button onClick={() => setDeleteAssignmentTarget(row)} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link to="/teacher/courses" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700">
          <ArrowLeft size={15} /> Back to My Courses
        </Link>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-900">{course.name}</h1>
              <StatusBadge status={course.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500">{course.subject} · {course.grade} · {totalLessons} lessons</p>
          </div>
          <div className="w-44">
            <PrimaryButton onClick={handlePublish} loading={publishing} disabled={course.status === "published"}>
              <Rocket size={15} /> {course.status === "published" ? "Published" : "Publish Course"}
            </PrimaryButton>
          </div>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Course Information" && (
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleGenerateAI}
              disabled={aiLoading}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {aiLoading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" /> : <Sparkles size={14} />}
              {aiLoading ? "Generating..." : "Generate using AI"}
            </button>
            <button
              onClick={() => setPdfModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <FileUp size={14} /> Generate from PDF
            </button>
          </div>

          <InputField label="Course Name" name="name" value={course.name} onChange={handleInfoChange} placeholder="e.g. Algebra Foundations" />
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Grade" name="grade" value={course.grade} onChange={handleInfoChange} options={GRADE_OPTIONS} />
            <SelectField label="Subject" name="subject" value={course.subject} onChange={handleInfoChange} options={SUBJECT_OPTIONS} />
          </div>
          <TextAreaField label="Description" name="description" value={course.description} onChange={handleInfoChange} rows={5} placeholder="What will students learn in this course?" />
        </div>
      )}

      {activeTab === "Modules & Lessons" && (
        <div className="space-y-3">
          {(course.modules || []).map((module, index) => (
            <ModuleEditor
              key={module.id}
              module={module}
              index={index}
              onChange={(updated) => updateModule(course.id, module.id, updated)}
              onRemove={() => deleteModule(course.id, module.id)}
              onMoveUp={index > 0 ? () => reorderModule(course.id, module.id, "up") : null}
              onMoveDown={index < course.modules.length - 1 ? () => reorderModule(course.id, module.id, "down") : null}
            />
          ))}
          <button
            onClick={() => addModule(course.id)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
          >
            <Plus size={16} /> Add Module
          </button>
        </div>
      )}

      {activeTab === "Assignments" && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Assignments</h2>
            <button
              onClick={openCreateAssignment}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              <Plus size={14} /> Add Assignment
            </button>
          </div>
          <DataTable
            columns={assignmentColumns}
            data={assignments}
            loading={false}
            keyExtractor={(row) => row.id}
            emptyTitle="No assignments yet"
            emptyDescription="Create an assignment — it will appear automatically for enrolled students."
          />
        </div>
      )}

      {activeTab === "Preview" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">{course.name}</h2>
            <p className="mt-1 text-sm text-slate-500">{course.subject} · {course.grade}</p>
            <p className="mt-3 text-sm text-slate-600">{course.description || "No description yet."}</p>
          </div>
          {(course.modules || []).map((module, mi) => (
            <div key={module.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-900">
                Module {mi + 1}: {(module.name || module.title || "").replace(/^Module \d+:\s*/, "")}
              </p>
              <p className="mt-1 text-sm text-slate-600">{module.description}</p>
              <ul className="mt-3 space-y-1.5">
                {(module.lessons || []).map((lesson, li) => (
                  <li key={lesson.id} className="text-sm text-slate-700">{li + 1}. {lesson.title}</li>
                ))}
              </ul>
            </div>
          ))}
          {(course.modules || []).length === 0 && (
            <p className="text-sm text-slate-400">No modules yet — add one, or generate a course with AI or a PDF.</p>
          )}
        </div>
      )}

      <AssignmentFormModal
        isOpen={assignmentModalOpen}
        onClose={() => setAssignmentModalOpen(false)}
        onSave={handleSaveAssignment}
        initialData={editingAssignment}
        lockCourseId={course.id}
      />

      <ConfirmationDialog
        isOpen={!!deleteAssignmentTarget}
        onClose={() => setDeleteAssignmentTarget(null)}
        onConfirm={confirmDeleteAssignment}
        title="Delete assignment"
        message={`Delete "${deleteAssignmentTarget?.title}"?`}
        confirmLabel="Delete"
      />

      <PDFUploadModal isOpen={pdfModalOpen} onClose={() => setPdfModalOpen(false)} onGenerate={handleGenerateFromPDF} loading={pdfLoading} />
    </div>
  );
}