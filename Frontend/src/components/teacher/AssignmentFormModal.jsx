import { useState, useEffect, useRef } from "react";
import { Sparkles, FileText, Upload, CheckCircle2, RefreshCw, Gamepad2, Plus, Trash2, HelpCircle } from "lucide-react";
import Modal from "../ui/Modal";
import InputField from "../ui/InputField";
import SelectField from "../ui/SelectField";
import TextAreaField from "../ui/TextAreaField";
import PrimaryButton from "../ui/PrimaryButton";
import { useCourses } from "../../context/CourseContext";
import { aiAPI, teacherAPI, rubricsAPI } from "../../services/api";

const TYPE_OPTIONS = [
  { value: "Quiz", label: "Quiz" },
  { value: "Homework", label: "Homework" },
  { value: "Project", label: "Project" },
  { value: "Gamified Match", label: "🎮 Gamified Match / Interactive Activity" },
];

const DEFAULT_MATCH_PAIRS = [
  { id: "pair-1", left: "Concept / Term 1", right: "Matching definition or explanation", emoji: "💡" },
  { id: "pair-2", left: "Concept / Term 2", right: "Matching definition or explanation", emoji: "🔬" },
  { id: "pair-3", left: "Concept / Term 3", right: "Matching definition or explanation", emoji: "⚡" },
  { id: "pair-4", left: "Concept / Term 4", right: "Matching definition or explanation", emoji: "🌱" },
];

function buildEmptyForm(lockCourseId) {
  return {
    title: "",
    description: "",
    type: TYPE_OPTIONS[0].value,
    dueDate: new Date().toISOString().slice(0, 10),
    maxPoints: "100",
    status: "open",
    courseId: lockCourseId || "",
    moduleId: "",
    lessonId: "",
    answerKey: "",
    targetType: "all",
    targetGrade: "",
    targetSection: "",
    matchPairs: DEFAULT_MATCH_PAIRS,
    quizQuestions: [],
    rubricId: "",
  };
}

// ---------------------------------------------------------------------------
// Self-grading Quiz question builder helpers. Reuses the exact
// {question, options, correct_index} shape Fun Games already uses
// (see GameFormModal.jsx) so the auto-grading backend can treat both the
// same way -- but this is a completely separate, self-contained code path,
// not an import from the games module.
// ---------------------------------------------------------------------------
function emptyQuizQuestion() {
  return { question: "", options: ["", ""], correctIndex: 0 };
}

function isValidQuizQuestion(q) {
  return q.question.trim().length > 0 && q.options.filter((o) => o.trim()).length >= 2;
}

function buildQuizQuestionPayload(q) {
  const options = [];
  let correctIndex = 0;
  q.options.forEach((opt, idx) => {
    const trimmed = opt.trim();
    if (!trimmed) return;
    if (idx === q.correctIndex) correctIndex = options.length;
    options.push(trimmed);
  });
  return { question: q.question.trim(), options, correct_index: correctIndex };
}

export default function AssignmentFormModal({ isOpen, onClose, onSave, initialData, lockCourseId }) {
  const { courses } = useCourses();
  const [formData, setFormData] = useState(buildEmptyForm(lockCourseId));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [extractingPdf, setExtractingPdf] = useState(false);
  const pdfInputRef = useRef(null);
  const [rubrics, setRubrics] = useState([]);

  useEffect(() => {
    rubricsAPI
      .list()
      .then((res) => setRubrics(Array.isArray(res.data) ? res.data : []))
      .catch(() => setRubrics([]));
  }, []);

  const selectedCourse = courses.find((c) => c.id === (lockCourseId || formData.courseId));
  const modules = selectedCourse?.modules || [];
  const selectedModule = modules.find((m) => m.id === formData.moduleId);
  const lessons = selectedModule?.lessons || [];

  const courseOptions = courses.map((c) => ({ value: c.id, label: c.name }));
  const moduleOptions = [{ value: "", label: "Select Module (Optional)" }, ...modules.map((m) => ({ value: m.id, label: m.title || m.name }))];
  const lessonOptions = [{ value: "", label: "Select Lesson (Optional)" }, ...lessons.map((l) => ({ value: l.id, label: l.title || l.name }))];

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const existingConfig = initialData.config || {};
        const pairs = Array.isArray(existingConfig.pairs) ? existingConfig.pairs : DEFAULT_MATCH_PAIRS;
        const quizQuestions = Array.isArray(existingConfig.questions)
          ? existingConfig.questions.map((q) => ({
              question: q.question || "",
              options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ["", ""],
              correctIndex: q.correct_index ?? q.correctIndex ?? 0,
            }))
          : [];
        setFormData({
          ...initialData,
          type: initialData.type || "Quiz",
          maxPoints: String(initialData.maxPoints || initialData.max_points || 100),
          description: initialData.description || "",
          answerKey: initialData.answerKey || initialData.answer_key || "",
          targetType: initialData.targetType || initialData.target_type || "all",
          matchPairs: pairs,
          quizQuestions,
          rubricId: initialData.rubricId || initialData.rubric_id || "",
        });
      } else {
        setFormData(buildEmptyForm(lockCourseId));
      }
      setErrors({});
    }
  }, [isOpen, initialData, lockCourseId]);

  function handleChange(e) {
    const { name, value } = e.target;

    // Bug fix: this used to compute `newTitle` from the `formData` closure and then
    // unconditionally spread `title: newTitle` after `[name]: value`, so editing the
    // Title field itself (name === "title") always got clobbered back to the previous
    // title on every keystroke -- the field was effectively impossible to type into.
    // Auto-title-from-course/lesson is now only applied as a side effect of THOSE
    // fields changing, and reads the previous state via the updater callback instead
    // of a stale render-time closure.
    setFormData((prev) => {
      let newTitle = prev.title;
      if (name === "courseId" && value) {
        const c = courses.find((item) => item.id === value);
        if (c && (!prev.title || prev.title.includes("— Practice Assignment") || prev.title.includes("— Assignment"))) {
          newTitle = `${c.name} — Assignment`;
        }
      } else if (name === "lessonId" && value) {
        const l = lessons.find((item) => item.id === value);
        if (l) {
          newTitle = `${l.title || l.name} — Practice Assignment`;
        }
      }
      return { ...prev, [name]: value, title: name === "title" ? value : newTitle };
    });
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleAIGenerate() {
    const topic = formData.title.trim() || selectedCourse?.name || "Core Curriculum Practice";
    setAiGenerating(true);
    try {
      const res = await aiAPI.generateAssignment({
        topic,
        grade_level: selectedCourse?.gradeLevel || "Grade 10",
        instructions: "Generate clear educational problem questions with step-by-step problem sets.",
      });
      if (res.data) {
        setFormData((prev) => ({
          ...prev,
          title: res.data.title || prev.title,
          description: res.data.description || prev.description,
          maxPoints: String(res.data.max_points || 100),
        }));
      }
    } catch (err) {
      setFormData((prev) => ({
        ...prev,
        title: `AI Assignment: ${topic}`,
        description: `Complete the comprehensive practice set on ${topic}. Answer all questions with complete working.`,
      }));
    } finally {
      setAiGenerating(false);
    }
  }

  function handlePairChange(index, field, value) {
    const updated = [...formData.matchPairs];
    updated[index] = { ...updated[index], [field]: value };
    setFormData((prev) => ({ ...prev, matchPairs: updated }));
  }

  function handleAddPair() {
    const newPair = {
      id: `pair-${Date.now()}`,
      left: "",
      right: "",
      emoji: ["⭐", "🎯", "🔬", "💡", "🌱", "⚡", "📖"][formData.matchPairs.length % 7],
    };
    setFormData((prev) => ({ ...prev, matchPairs: [...prev.matchPairs, newPair] }));
  }

  function handleRemovePair(index) {
    setFormData((prev) => ({ ...prev, matchPairs: prev.matchPairs.filter((_, i) => i !== index) }));
  }

  // ---- Self-grading Quiz questions ----
  function handleUpdateQuizQuestion(idx, field, value) {
    setFormData((prev) => {
      const quizQuestions = [...(prev.quizQuestions || [])];
      quizQuestions[idx] = { ...quizQuestions[idx], [field]: value };
      return { ...prev, quizQuestions };
    });
  }
  function handleUpdateQuizOption(qIdx, optIdx, value) {
    setFormData((prev) => {
      const quizQuestions = [...(prev.quizQuestions || [])];
      const options = [...quizQuestions[qIdx].options];
      options[optIdx] = value;
      quizQuestions[qIdx] = { ...quizQuestions[qIdx], options };
      return { ...prev, quizQuestions };
    });
  }
  function handleAddQuizOption(qIdx) {
    setFormData((prev) => {
      const quizQuestions = [...(prev.quizQuestions || [])];
      quizQuestions[qIdx] = { ...quizQuestions[qIdx], options: [...quizQuestions[qIdx].options, ""] };
      return { ...prev, quizQuestions };
    });
  }
  function handleRemoveQuizOption(qIdx, optIdx) {
    setFormData((prev) => {
      const quizQuestions = [...(prev.quizQuestions || [])];
      const options = quizQuestions[qIdx].options.filter((_, i) => i !== optIdx);
      let correctIndex = quizQuestions[qIdx].correctIndex;
      if (correctIndex >= options.length) correctIndex = 0;
      quizQuestions[qIdx] = { ...quizQuestions[qIdx], options, correctIndex };
      return { ...prev, quizQuestions };
    });
  }
  function handleAddQuizQuestion() {
    setFormData((prev) => ({ ...prev, quizQuestions: [...(prev.quizQuestions || []), emptyQuizQuestion()] }));
  }
  function handleRemoveQuizQuestion(idx) {
    setFormData((prev) => ({ ...prev, quizQuestions: (prev.quizQuestions || []).filter((_, i) => i !== idx) }));
  }

  async function handleGenerateAnswerKey() {
    if (!formData.description) {
      setFormData((prev) => ({
        ...prev,
        answerKey: "1. Part 1: Conceptual derivation and formula parameters (40 pts)\n2. Part 2: Step-by-step intermediate calculation (30 pts)\n3. Part 3: Final units, accuracy, and justification (30 pts)"
      }));
      return;
    }

    setAiGenerating(true);
    try {
      const res = await aiAPI.generateAssignment({
        topic: `Answer Key and Rubric for: ${formData.title}`,
        grade_level: "Grade 10",
        instructions: `Create a step-by-step official Answer Key and Scoring Rubric for this problem set:\n${formData.description}`,
      });
      if (res.data) {
        setFormData((prev) => ({
          ...prev,
          answerKey: res.data.description || res.data.title,
        }));
      }
    } catch (err) {
      setFormData((prev) => ({
        ...prev,
        answerKey: "Official Scoring Rubric:\n- Part 1: Correct formula and parameters (40 pts)\n- Part 2: Intermediate calculation steps (30 pts)\n- Part 3: Final result and conclusion (30 pts)",
      }));
    } finally {
      setAiGenerating(false);
    }
  }

  async function handlePdfUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtractingPdf(true);
    try {
      const res = await teacherAPI.extractAnswerKeyPDF(file);
      if (res.data?.answerKey) {
        setFormData((prev) => ({
          ...prev,
          answerKey: res.data.answerKey,
        }));
      }
    } catch (err) {
      console.error("PDF Answer key extraction error", err);
    } finally {
      setExtractingPdf(false);
    }
  }

  function validate() {
    const errs = {};
    if (!lockCourseId && !formData.courseId) errs.courseId = "Select a course";
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    let finalTitle = formData.title;
    if (!finalTitle || !finalTitle.trim()) {
      finalTitle = selectedCourse ? `${selectedCourse.name} — Practice Assignment` : "Practice Assignment";
    }

    const validQuizQuestions = (formData.quizQuestions || []).filter(isValidQuizQuestion);
    let config = null;
    if (formData.type === "Gamified Match") {
      config = { pairs: formData.matchPairs };
    } else if (formData.type === "Quiz" && validQuizQuestions.length > 0) {
      config = { questions: validQuizQuestions.map(buildQuizQuestionPayload) };
    }

    setSaving(true);
    setTimeout(() => {
      const result = onSave({
        ...formData,
        title: finalTitle,
        type: formData.type || "Quiz",
        config,
        maxPoints: Number(formData.maxPoints) || 100,
        courseId: lockCourseId || formData.courseId,
      });

      if (result && typeof result.then === "function") {
        result.finally(() => setSaving(false));
      } else {
        setSaving(false);
      }
    }, 200);
  }

  const isGamified = formData.type === "Gamified Match";
  const isQuiz = formData.type === "Quiz";
  const descWordCount = formData.description?.trim() ? formData.description.trim().split(/\s+/).length : 0;
  const keyWordCount = formData.answerKey?.trim() ? formData.answerKey.trim().split(/\s+/).length : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Assignment" : "Create New Assignment"} maxWidth="max-w-5xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Course, Module & Lesson Pickers */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {!lockCourseId && (
            <SelectField
              label="Course *"
              name="courseId"
              value={formData.courseId}
              onChange={handleChange}
              options={[{ value: "", label: "Select Course" }, ...courseOptions]}
              error={errors.courseId}
            />
          )}

          {modules.length > 0 && (
            <SelectField
              label="Module"
              name="moduleId"
              value={formData.moduleId}
              onChange={handleChange}
              options={moduleOptions}
            />
          )}

          {lessons.length > 0 && (
            <SelectField
              label="Lesson"
              name="lessonId"
              value={formData.lessonId}
              onChange={handleChange}
              options={lessonOptions}
            />
          )}
        </div>

        {/* Assignment Type & Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SelectField
            label="Assignment Format / Type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            options={TYPE_OPTIONS}
          />
          <InputField label="Due Date" name="dueDate" type="date" value={formData.dueDate} onChange={handleChange} />
          <InputField label="Max Points" name="maxPoints" type="number" value={formData.maxPoints} onChange={handleChange} placeholder="100" />
        </div>

        {/* Grading Rubric picker -- optional, built from the teacher's own
            saved rubrics (Teacher > Rubrics). Grading against one derives
            the total from per-criterion scores instead of one raw number. */}
        <SelectField
          label="Grading Rubric (optional)"
          name="rubricId"
          value={formData.rubricId || ""}
          onChange={handleChange}
          options={[
            { value: "", label: "No rubric — grade with a single point total" },
            ...rubrics.map((r) => ({ value: r.id, label: `${r.title} (${r.totalPoints} pts)` })),
          ]}
        />

        {/* Title Header with AI Generator */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">Assignment Title</label>
            <button
              type="button"
              onClick={handleAIGenerate}
              disabled={aiGenerating}
              className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
            >
              <Sparkles size={13} /> {aiGenerating ? "Generating Title & Prompt..." : "Auto-Generate with AI"}
            </button>
          </div>
          <InputField
            name="title"
            value={formData.title}
            onChange={handleChange}
            error={errors.title}
            placeholder="e.g. Unit 3: Advanced Thermodynamics & Relativity Practice"
          />
        </div>

        {/* Problem Questions / Instructions - Extra Large Box */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-700">
              {isGamified ? "Activity Instructions & Prompt" : "Problem Questions / Comprehensive Instructions *"}
            </label>
            <span className="text-[11px] text-slate-400 font-mono">
              {descWordCount} words · {formData.description?.length || 0} chars
            </span>
          </div>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={10}
            placeholder={
              isGamified
                ? "Provide instructions for the interactive matching activity..."
                : "Enter complete problem sets, equations, reading prompts, multi-part questions, or essay guidelines for students..."
            }
            className="w-full min-h-[220px] rounded-xl border border-slate-300 bg-white p-4 text-sm font-normal leading-relaxed text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* GAMIFIED MATCH PAIRS BUILDER SECTION */}
        {isGamified && (
          <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-purple-50/40 p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-indigo-100 pb-3">
              <div className="flex items-center gap-2">
                <Gamepad2 className="text-indigo-600" size={20} />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wide text-indigo-950">
                    Interactive Matching Pairs ({formData.matchPairs.length} Pairs)
                  </h4>
                  <p className="text-[11px] text-indigo-700">
                    Students will connect each Item on the left to its matching counterpart on the right.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {formData.matchPairs.map((pair, index) => (
                <div key={pair.id || index} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-base">
                    {pair.emoji || "🎯"}
                  </span>
                  <div className="grid flex-1 grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={pair.left}
                      onChange={(e) => handlePairChange(index, "left", e.target.value)}
                      placeholder={`Left Item ${index + 1} (Term / Picture Concept)`}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={pair.right}
                      onChange={(e) => handlePairChange(index, "right", e.target.value)}
                      placeholder={`Right Match ${index + 1} (Definition / Solution)`}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePair(index)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    title="Remove Pair"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddPair}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-indigo-300 bg-white/70 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-white"
            >
              <Plus size={14} /> Add Another Pair
            </button>
          </div>
        )}

        {/* SELF-GRADING QUIZ QUESTIONS BUILDER SECTION */}
        {isQuiz && (
          <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-teal-50/40 p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-emerald-100 pb-3">
              <div className="flex items-start gap-2">
                <HelpCircle className="mt-0.5 shrink-0 text-emerald-600" size={20} />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-950">
                    Self-Grading Quiz Questions ({formData.quizQuestions.length})
                  </h4>
                  <p className="mt-1 max-w-md text-[11px] text-emerald-700">
                    Optional. Add questions to make this a self-grading quiz — students get an instant score and you never have to grade it. Leave empty for a normal assignment you grade yourself.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddQuizQuestion}
                className="flex shrink-0 items-center gap-1 rounded-lg border border-dashed border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                <Plus size={13} /> Add Question
              </button>
            </div>

            {formData.quizQuestions.length === 0 ? (
              <p className="text-xs italic text-slate-500">
                No questions yet — this assignment will behave as a normal, manually-graded assignment.
              </p>
            ) : (
              <div className="max-h-96 space-y-4 overflow-y-auto pr-1">
                {formData.quizQuestions.map((q, qIdx) => (
                  <div key={qIdx} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-start gap-2">
                      <input
                        value={q.question}
                        onChange={(e) => handleUpdateQuizQuestion(qIdx, "question", e.target.value)}
                        placeholder={`Question ${qIdx + 1}`}
                        className="w-full flex-1 rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveQuizQuestion(qIdx)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Remove Question"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="space-y-2 pl-2">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`quiz-correct-${qIdx}`}
                            checked={q.correctIndex === optIdx}
                            onChange={() => handleUpdateQuizQuestion(qIdx, "correctIndex", optIdx)}
                            title="Mark as correct answer"
                          />
                          <input
                            value={opt}
                            onChange={(e) => handleUpdateQuizOption(qIdx, optIdx, e.target.value)}
                            placeholder={`Option ${optIdx + 1}`}
                            className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                          />
                          {q.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveQuizOption(qIdx, optIdx)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              title="Remove Option"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleAddQuizOption(qIdx)}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                      >
                        + Add option
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Official Answer Key & Rubric Section - Extra Large Box */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-indigo-600" />
              <label className="text-xs font-bold uppercase tracking-wide text-slate-700">
                Official Answer Key & Scoring Rubric
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => pdfInputRef.current?.click()}
                disabled={extractingPdf}
                className="flex items-center gap-1 rounded-lg bg-white border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-sm"
              >
                <Upload size={12} />
                {extractingPdf ? "Extracting..." : "Upload Key PDF"}
              </button>
              <button
                type="button"
                onClick={handleGenerateAnswerKey}
                disabled={aiGenerating}
                className="flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
              >
                <Sparkles size={12} />
                AI Generate Key
              </button>
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handlePdfUpload}
              />
            </div>
          </div>
          <div className="space-y-1">
            <textarea
              rows={8}
              name="answerKey"
              value={formData.answerKey}
              onChange={handleChange}
              placeholder="Enter step-by-step correct answers or scoring rubric used for AI-assisted and manual grading..."
              className="w-full min-h-[180px] rounded-xl border border-slate-300 bg-white p-4 text-sm font-normal leading-relaxed text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <div className="flex justify-end">
              <span className="text-[11px] text-slate-400 font-mono">
                {keyWordCount} words · {formData.answerKey?.length || 0} chars
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <div className="w-44">
            <PrimaryButton type="submit" loading={saving}>
              {initialData ? "Save Changes" : "Create Assignment"}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </Modal>
  );
}