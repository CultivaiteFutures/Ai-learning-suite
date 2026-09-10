import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import Modal from "../ui/Modal";
import InputField from "../ui/InputField";
import TextAreaField from "../ui/TextAreaField";
import PrimaryButton from "../ui/PrimaryButton";

function toLocalInputValue(date) {
  // datetime-local inputs need "YYYY-MM-DDTHH:mm" in local time, no timezone suffix.
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

let nextLocalId = 1;
function newQuestion() {
  return {
    id: `new-${nextLocalId++}`,
    text: "",
    type: "mcq",
    options: ["", ""],
    correctIndex: 0,
    correctAnswer: true,
    points: 1,
  };
}

function DEFAULT_FORM() {
  const now = new Date();
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    title: "",
    description: "",
    subject: "",
    allGrades: true,
    selectedGradeIds: [],
    startDate: toLocalInputValue(now),
    endDate: toLocalInputValue(in7days),
    bonusXp: 20,
    badgeName: "",
    questions: [newQuestion()],
  };
}

/**
 * School Admin's challenge author/edit form: a school-wide quiz scoped to
 * one or more grades (e.g. "grades 7-10"), made of multiple-choice /
 * true-false questions that are auto-graded on submit -- there is no manual
 * grading step anywhere in this flow.
 *
 * Only School Admin can open this modal (Teacher's Challenges page is
 * view-only per the product decision to replace teacher-authored challenges
 * entirely with admin-authored school-wide ones).
 */
export default function ChallengeFormModal({ isOpen, onClose, onSave, grades = [], initialData = null, saving = false }) {
  const [formData, setFormData] = useState(DEFAULT_FORM());
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      const gradeIds = initialData.targetGradeIds || [];
      setFormData({
        title: initialData.title || "",
        description: initialData.description || "",
        subject: initialData.subject || "",
        allGrades: gradeIds.length === 0,
        selectedGradeIds: gradeIds,
        startDate: toLocalInputValue(new Date(initialData.startDate)),
        endDate: toLocalInputValue(new Date(initialData.endDate)),
        bonusXp: initialData.bonusXp ?? 20,
        badgeName: initialData.badgeName || "",
        questions: (initialData.questions && initialData.questions.length
          ? initialData.questions
          : [newQuestion()]
        ).map((q) => ({
          id: q.id || `new-${nextLocalId++}`,
          text: q.text || "",
          type: q.type || "mcq",
          options: q.options && q.options.length >= 2 ? q.options : ["", ""],
          correctIndex: q.correctIndex ?? 0,
          correctAnswer: q.correctAnswer ?? true,
          points: q.points ?? 1,
        })),
      });
    } else {
      setFormData(DEFAULT_FORM());
    }
    setErrors({});
  }, [isOpen, initialData]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function toggleGrade(gradeId) {
    setFormData((prev) => {
      const already = prev.selectedGradeIds.includes(gradeId);
      return {
        ...prev,
        selectedGradeIds: already
          ? prev.selectedGradeIds.filter((id) => id !== gradeId)
          : [...prev.selectedGradeIds, gradeId],
      };
    });
  }

  function setAllGrades(value) {
    setFormData((prev) => ({ ...prev, allGrades: value, selectedGradeIds: value ? [] : prev.selectedGradeIds }));
  }

  function updateQuestion(qid, patch) {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === qid ? { ...q, ...patch } : q)),
    }));
  }

  function updateOption(qid, index, value) {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === qid ? { ...q, options: q.options.map((o, i) => (i === index ? value : o)) } : q
      ),
    }));
  }

  function addOption(qid) {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === qid && q.options.length < 6 ? { ...q, options: [...q.options, ""] } : q
      ),
    }));
  }

  function removeOption(qid, index) {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => {
        if (q.id !== qid || q.options.length <= 2) return q;
        const options = q.options.filter((_, i) => i !== index);
        const correctIndex = q.correctIndex >= options.length ? 0 : q.correctIndex;
        return { ...q, options, correctIndex };
      }),
    }));
  }

  function addQuestion() {
    setFormData((prev) => ({ ...prev, questions: [...prev.questions, newQuestion()] }));
  }

  function removeQuestion(qid) {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.length > 1 ? prev.questions.filter((q) => q.id !== qid) : prev.questions,
    }));
  }

  function validate() {
    const next = {};
    if (!formData.title.trim()) next.title = "Title is required";
    if (!formData.allGrades && formData.selectedGradeIds.length === 0) {
      next.grades = "Select at least one grade, or choose All grades";
    }
    if (!formData.startDate) next.startDate = "Start date is required";
    if (!formData.endDate) next.endDate = "End date is required";
    if (formData.startDate && formData.endDate && new Date(formData.endDate) <= new Date(formData.startDate)) {
      next.endDate = "End date must be after the start date";
    }
    if (!formData.bonusXp || Number(formData.bonusXp) < 0) next.bonusXp = "Bonus XP must be 0 or more";

    const questionErrors = {};
    formData.questions.forEach((q) => {
      if (!q.text.trim()) {
        questionErrors[q.id] = "Question text is required";
      } else if (q.type === "mcq" && q.options.filter((o) => o.trim()).length < 2) {
        questionErrors[q.id] = "Add at least 2 answer options";
      }
    });
    if (Object.keys(questionErrors).length) next.questions = questionErrors;

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      subject: formData.subject.trim() || null,
      targetGradeIds: formData.allGrades ? [] : formData.selectedGradeIds,
      startDate: new Date(formData.startDate).toISOString(),
      endDate: new Date(formData.endDate).toISOString(),
      bonusXp: Number(formData.bonusXp),
      badgeName: formData.badgeName.trim() || null,
      questions: formData.questions.map((q) => ({
        id: q.id.startsWith("new-") ? undefined : q.id,
        text: q.text.trim(),
        type: q.type,
        options: q.type === "mcq" ? q.options.map((o) => o.trim()) : null,
        correctIndex: q.type === "mcq" ? Number(q.correctIndex) : null,
        correctAnswer: q.type === "true_false" ? !!q.correctAnswer : null,
        points: Number(q.points) || 1,
      })),
    });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Challenge" : "New Challenge"}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <InputField
          label="Title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="e.g. Algebra Fundamentals Quiz"
          error={errors.title}
        />
        <TextAreaField
          label="Description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="What are students being tested on?"
          rows={2}
        />
        <InputField
          label="Subject"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          placeholder="e.g. Math"
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Grades</label>
          <div className="rounded-lg border border-slate-200 p-3">
            <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={formData.allGrades}
                onChange={(e) => setAllGrades(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              All grades (whole school)
            </label>
            {!formData.allGrades && (
              <div className="grid grid-cols-2 gap-1.5 border-t border-slate-100 pt-2 sm:grid-cols-3">
                {grades.length === 0 && (
                  <p className="col-span-full text-xs text-slate-400">No grades set up yet.</p>
                )}
                {grades.map((g) => (
                  <label key={g.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={formData.selectedGradeIds.includes(g.id)}
                      onChange={() => toggleGrade(g.id)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    {g.name}
                  </label>
                ))}
              </div>
            )}
          </div>
          {errors.grades && <p className="mt-1 text-xs font-medium text-rose-600">{errors.grades}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField
            label="Start Date"
            name="startDate"
            type="datetime-local"
            value={formData.startDate}
            onChange={handleChange}
            error={errors.startDate}
          />
          <InputField
            label="End Date"
            name="endDate"
            type="datetime-local"
            value={formData.endDate}
            onChange={handleChange}
            error={errors.endDate}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField
            label="Bonus XP"
            name="bonusXp"
            type="number"
            value={formData.bonusXp}
            onChange={handleChange}
            error={errors.bonusXp}
          />
          <InputField
            label="Badge Name (optional)"
            name="badgeName"
            value={formData.badgeName}
            onChange={handleChange}
            placeholder="e.g. Sprinter"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">Questions</label>
            <button
              type="button"
              onClick={addQuestion}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              <Plus size={14} /> Add Question
            </button>
          </div>

          <div className="space-y-3">
            {formData.questions.map((q, qIndex) => (
              <div key={q.id} className="rounded-lg border border-slate-200 p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="mt-2.5 shrink-0 text-xs font-semibold text-slate-400">Q{qIndex + 1}</span>
                  <div className="flex-1 space-y-3">
                    <textarea
                      value={q.text}
                      onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                      placeholder="Question text"
                      rows={2}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />

                    <div className="flex flex-wrap items-center gap-4">
                      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <input
                          type="radio"
                          name={`type-${q.id}`}
                          checked={q.type === "mcq"}
                          onChange={() => updateQuestion(q.id, { type: "mcq" })}
                        />
                        Multiple choice
                      </label>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <input
                          type="radio"
                          name={`type-${q.id}`}
                          checked={q.type === "true_false"}
                          onChange={() => updateQuestion(q.id, { type: "true_false" })}
                        />
                        True / False
                      </label>
                      <label className="ml-auto flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        Points
                        <input
                          type="number"
                          min={1}
                          value={q.points}
                          onChange={(e) => updateQuestion(q.id, { points: e.target.value })}
                          className="w-16 rounded-md border border-slate-300 px-2 py-1 text-xs"
                        />
                      </label>
                    </div>

                    {q.type === "mcq" ? (
                      <div className="space-y-1.5">
                        {q.options.map((opt, oIndex) => (
                          <div key={oIndex} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${q.id}`}
                              checked={q.correctIndex === oIndex}
                              onChange={() => updateQuestion(q.id, { correctIndex: oIndex })}
                              title="Mark as correct answer"
                            />
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => updateOption(q.id, oIndex, e.target.value)}
                              placeholder={`Option ${oIndex + 1}`}
                              className="flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                            />
                            {q.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeOption(q.id, oIndex)}
                                className="text-slate-300 hover:text-rose-500"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                        {q.options.length < 6 && (
                          <button
                            type="button"
                            onClick={() => addOption(q.id)}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                          >
                            + Add option
                          </button>
                        )}
                        <p className="text-[11px] text-slate-400">Select the radio button next to the correct option.</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 text-sm text-slate-600">
                          <input
                            type="radio"
                            name={`tf-${q.id}`}
                            checked={q.correctAnswer === true}
                            onChange={() => updateQuestion(q.id, { correctAnswer: true })}
                          />
                          True
                        </label>
                        <label className="flex items-center gap-1.5 text-sm text-slate-600">
                          <input
                            type="radio"
                            name={`tf-${q.id}`}
                            checked={q.correctAnswer === false}
                            onChange={() => updateQuestion(q.id, { correctAnswer: false })}
                          />
                          False
                        </label>
                      </div>
                    )}

                    {errors.questions?.[q.id] && (
                      <p className="text-xs font-medium text-rose-600">{errors.questions[q.id]}</p>
                    )}
                  </div>
                  {formData.questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(q.id)}
                      className="mt-1 shrink-0 text-slate-300 hover:text-rose-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
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
              {initialData ? "Save Changes" : "Create"}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </Modal>
  );
}
