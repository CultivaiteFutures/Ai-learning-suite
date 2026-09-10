import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  AlertTriangle,
  Paperclip,
  Sparkles,
  Save,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import TextAreaField from "../../components/ui/TextAreaField";
import PrimaryButton from "../../components/ui/PrimaryButton";
import { useCourses } from "../../context/CourseContext";
import { teacherAPI, rubricsAPI } from "../../services/api";
import { formatRelativeDate } from "../../utils/formatDate";

function formatAbsoluteDateTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function GradingPanel({ submission, maxPoints, hasAnswerKey, answerKeyText, rubricId, onSaved }) {
  const [gradePoints, setGradePoints] = useState(
    submission.gradePoints !== null && submission.gradePoints !== undefined ? String(submission.gradePoints) : ""
  );
  const [feedback, setFeedback] = useState(submission.feedback || "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [rubric, setRubric] = useState(null);
  const [rubricLoading, setRubricLoading] = useState(Boolean(rubricId));
  const [criterionScores, setCriterionScores] = useState({});
  const [criterionJustifications, setCriterionJustifications] = useState({});

  useEffect(() => {
    if (!rubricId) {
      setRubric(null);
      setRubricLoading(false);
      return;
    }
    setRubricLoading(true);
    rubricsAPI
      .get(rubricId)
      .then((res) => {
        setRubric(res.data);
        const existing = {};
        (submission.rubricScores || []).forEach((s) => {
          existing[s.criterionId] = s.pointsAwarded;
        });
        const initialScores = {};
        res.data.criteria.forEach((c) => {
          initialScores[c.id] = existing[c.id] !== undefined ? String(existing[c.id]) : "";
        });
        setCriterionScores(initialScores);
      })
      .catch(() => setRubric(null))
      .finally(() => setRubricLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rubricId]);

  const rubricTotal = rubric
    ? rubric.criteria.reduce((sum, c) => sum + (Number(criterionScores[c.id]) || 0), 0)
    : 0;

  function updateCriterionScore(criterionId, value) {
    setCriterionScores((prev) => ({ ...prev, [criterionId]: value }));
  }

  async function handleSave() {
    let payload;

    if (rubric) {
      const rubricScores = rubric.criteria.map((c) => {
        const raw = criterionScores[c.id];
        return { criterionId: c.id, pointsAwarded: raw === "" || raw === undefined ? 0 : Number(raw) };
      });
      const invalid = rubricScores.some((s, idx) => Number.isNaN(s.pointsAwarded) || s.pointsAwarded < 0 || s.pointsAwarded > rubric.criteria[idx].maxPoints);
      if (invalid) {
        setSaveError("Each criterion score must be between 0 and its max points.");
        return;
      }
      payload = { rubricScores, feedback };
    } else {
      if (gradePoints !== "") {
        const numeric = Number(gradePoints);
        if (Number.isNaN(numeric)) {
          setSaveError("Grade must be a number.");
          return;
        }
        if (numeric < 0 || numeric > maxPoints) {
          setSaveError(`Grade must be between 0 and ${maxPoints}.`);
          return;
        }
      }
      payload = { grade_points: gradePoints === "" ? null : Number(gradePoints), feedback };
    }

    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    try {
      const res = await teacherAPI.gradeSubmission(submission.id, payload);
      onSaved(res.data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      setSaveError(err.response?.data?.detail || "Failed to save grade. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAiSuggest() {
    setAiLoading(true);
    setAiError("");
    try {
      if (rubric) {
        const res = await teacherAPI.gradeWithRubric(submission.id);
        const suggestion = res.data;
        setAiSuggestion(suggestion);
        const nextScores = { ...criterionScores };
        const nextJustifications = {};
        (suggestion.criteria || []).forEach((c) => {
          nextScores[c.criterionId ?? c.criterion_id] = String(c.suggestedPoints ?? c.suggested_points);
          nextJustifications[c.criterionId ?? c.criterion_id] = c.justification;
        });
        setCriterionScores(nextScores);
        setCriterionJustifications(nextJustifications);
        if (suggestion.overallFeedback ?? suggestion.overall_feedback) {
          setFeedback(suggestion.overallFeedback ?? suggestion.overall_feedback);
        }
      } else {
        const res = await teacherAPI.gradeWithAnswerKey({
          submissionId: submission.id,
          answerKeyText: answerKeyText,
        });
        const suggestion = res.data;
        setAiSuggestion(suggestion);
        if (suggestion.suggested_grade !== undefined && suggestion.suggested_grade !== null) {
          setGradePoints(String(suggestion.suggested_grade));
        }
        if (suggestion.feedback) {
          setFeedback(suggestion.feedback);
        }
      }
    } catch (err) {
      setAiError(
        `AI grading is not available: ${err.response?.data?.detail || err.message || "Unknown error."}`
      );
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-slate-900">Grade This Submission</h2>

      {rubricLoading ? (
        <p className="text-xs text-slate-400">Loading rubric...</p>
      ) : rubric ? (
        <div className="space-y-3 rounded-lg border border-indigo-100 bg-indigo-50/40 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-900">{rubric.title}</p>
          {rubric.criteria.map((c) => (
            <div key={c.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{c.title}</p>
                  {c.description && <p className="truncate text-xs text-slate-400">{c.description}</p>}
                </div>
                <input
                  type="number"
                  min={0}
                  max={c.maxPoints}
                  value={criterionScores[c.id] ?? ""}
                  onChange={(e) => updateCriterionScore(c.id, e.target.value)}
                  placeholder={`/ ${c.maxPoints}`}
                  className="w-20 shrink-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              {criterionJustifications[c.id] && (
                <p className="mt-1 flex items-start gap-1 text-xs text-indigo-600">
                  <Sparkles size={11} className="mt-0.5 shrink-0" />
                  {criterionJustifications[c.id]}
                </p>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-indigo-100 pt-2 text-sm font-semibold text-indigo-900">
            <span>Total</span>
            <span>{rubricTotal} / {rubric.totalPoints}</span>
          </div>
        </div>
      ) : (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Grade (out of {maxPoints})</label>
          <input
            type="number"
            min={0}
            max={maxPoints}
            value={gradePoints}
            onChange={(e) => setGradePoints(e.target.value)}
            placeholder="—"
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      )}

      <button
        type="button"
        onClick={handleAiSuggest}
        disabled={(!hasAnswerKey && !rubric) || aiLoading}
        title={
          rubric
            ? "Ask AI to score each rubric criterion from the submission"
            : hasAnswerKey
            ? "Ask AI to suggest a grade from the answer key"
            : "No answer key or rubric configured for this assignment"
        }
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
      >
        {aiLoading ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-700" />
        ) : (
          <Sparkles size={14} />
        )}
        {rubric ? "AI Suggest Rubric Scores" : "AI Suggest Grade"}
      </button>

      <TextAreaField
        label="Feedback"
        name={`feedback-${submission.id}`}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Write feedback for the student..."
        rows={6}
      />

      {aiError && (
        <p className="flex items-start gap-1.5 text-xs font-medium text-rose-600">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          {aiError}
        </p>
      )}

      {aiSuggestion && !aiError && rubric && (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-slate-700">
          <p className="font-semibold text-indigo-700">
            AI scored every criterion above (review before saving) — total suggested: {rubricTotal} / {rubric.totalPoints}
          </p>
        </div>
      )}

      {aiSuggestion && !aiError && !rubric && (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-slate-700">
          <p className="font-semibold text-indigo-700">
            AI suggestion: {aiSuggestion.suggested_grade}/{aiSuggestion.max_points ?? maxPoints} (review before saving)
          </p>
          {Array.isArray(aiSuggestion.strengths) && aiSuggestion.strengths.length > 0 && (
            <div className="mt-1.5">
              <p className="font-medium text-slate-600">Strengths</p>
              <ul className="ml-4 list-disc">
                {aiSuggestion.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {Array.isArray(aiSuggestion.areas_for_improvement) && aiSuggestion.areas_for_improvement.length > 0 && (
            <div className="mt-1.5">
              <p className="font-medium text-slate-600">Areas for improvement</p>
              <ul className="ml-4 list-disc">
                {aiSuggestion.areas_for_improvement.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {saveError && (
        <p className="flex items-start gap-1.5 text-xs font-medium text-rose-600">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          {saveError}
        </p>
      )}

      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 shadow-sm">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          <span>Grade saved successfully.</span>
        </div>
      )}

      <PrimaryButton onClick={handleSave} loading={saving}>
        <Save size={15} />
        Save Grade
      </PrimaryButton>
    </div>
  );
}

export default function GradeSubmissionPage() {
  const { assignmentId, submissionId } = useParams();
  const { assignments, assignmentsLoading, courses } = useCourses();
  const [submissions, setSubmissions] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const assignment = assignments.find((a) => a.id === assignmentId);
  const course = assignment ? courses.find((c) => c.id === assignment.courseId) : null;

  const loadData = useCallback(() => {
    setLoading(true);
    setLoadError("");
    Promise.all([teacherAPI.getSubmissions(assignmentId), teacherAPI.getStudents()])
      .then(([subsRes, studentsRes]) => {
        setSubmissions(Array.isArray(subsRes.data) ? subsRes.data : []);
        setStudents(Array.isArray(studentsRes.data) ? studentsRes.data : []);
        setLoading(false);
      })
      .catch((err) => {
        setLoadError(err.response?.data?.detail || "Failed to load submission.");
        setLoading(false);
      });
  }, [assignmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const studentMap = useMemo(() => {
    const map = {};
    students.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [students]);

  const submission = submissions.find((s) => s.id === submissionId);
  const student = submission ? studentMap[submission.studentId] : null;

  function handleSaved(updatedSubmission) {
    setSubmissions((prev) => prev.map((s) => (s.id === updatedSubmission.id ? updatedSubmission : s)));
  }

  const backLink = `/teacher/assignments/${assignmentId}/submissions`;

  // Assignment context is still loading (no assignments fetched yet, still empty).
  if (assignmentsLoading && !assignment) {
    return (
      <div className="space-y-6">
        <Link to="/teacher/assignments" className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600">
          <ArrowLeft size={15} />
          Back to Assignments
        </Link>
        <LoadingState rows={4} columns={2} />
      </div>
    );
  }

  // Assignments have loaded and this id genuinely doesn't exist.
  if (!assignment) {
    return (
      <div className="space-y-6">
        <Link to="/teacher/assignments" className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600">
          <ArrowLeft size={15} />
          Back to Assignments
        </Link>
        <EmptyState
          title="Assignment not found"
          description="This assignment doesn't exist or you don't have access to it."
          icon={AlertTriangle}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Link to={backLink} className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600">
          <ArrowLeft size={15} />
          Back to Submissions
        </Link>
        <LoadingState rows={4} columns={2} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <Link to={backLink} className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600">
          <ArrowLeft size={15} />
          Back to Submissions
        </Link>
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-10 text-center">
          <p className="text-sm font-medium text-rose-600">{loadError}</p>
          <button
            onClick={loadData}
            className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Submissions loaded successfully but this submissionId isn't among them
  // (bad URL, or the submission was removed).
  if (!submission) {
    return (
      <div className="space-y-6">
        <Link to={backLink} className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600">
          <ArrowLeft size={15} />
          Back to Submissions
        </Link>
        <EmptyState
          title="Submission not found"
          description="This submission doesn't exist or may have been removed."
          icon={AlertTriangle}
        />
      </div>
    );
  }

  const maxPoints = assignment.maxPoints || 100;
  const hasAnswerKey = Boolean(assignment.answerKey);
  const isGraded = submission.gradePoints !== null && submission.gradePoints !== undefined;

  // Real auto-graded quiz submissions store a JSON blob ({answers, correct,
  // total}) rather than free text. When the assignment carries real quiz
  // questions and the content parses that way, render a clean per-question
  // review instead of the raw JSON; any other submission simply fails
  // JSON.parse and falls through to plain-text rendering below.
  let quizReviewAnswers = null;
  if (
    assignment.type === "Quiz" &&
    Array.isArray(assignment.config?.questions) &&
    assignment.config.questions.length > 0 &&
    submission.content
  ) {
    try {
      const parsed = JSON.parse(submission.content);
      if (parsed && Array.isArray(parsed.answers)) {
        quizReviewAnswers = parsed.answers;
      }
    } catch {
      quizReviewAnswers = null;
    }
  }

  return (
    <div className="space-y-6">
      <Link to={backLink} className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600">
        <ArrowLeft size={15} />
        Back to Submissions
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{student?.name || "Unknown student"}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{student?.email || submission.studentId}</p>
          <p className="mt-2 text-sm text-slate-600">
            {course?.name ? `${course.name} · ` : ""}
            {assignment.title}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {submission.submittedAt
              ? `Submitted ${formatRelativeDate(submission.submittedAt)} (${formatAbsoluteDateTime(submission.submittedAt)})`
              : "Submission date unavailable"}
          </p>
        </div>

        {isGraded ? (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
            Graded: {submission.gradePoints}/{maxPoints}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
            Not graded yet
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Student's Answer</h2>

            {quizReviewAnswers ? (
              <div className="space-y-3">
                <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <HelpCircle size={14} className="text-indigo-600" />
                  Auto-graded quiz — per-question review
                </p>
                {assignment.config.questions.map((q, qIdx) => {
                  const pickedIdx = quizReviewAnswers[qIdx];
                  const correctIdx = q.correct_index ?? q.correctIndex ?? -1;
                  const wasCorrect = pickedIdx !== null && pickedIdx !== undefined && pickedIdx === correctIdx;
                  return (
                    <div key={qIdx} className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-1.5">
                      <p className="text-sm font-semibold text-slate-900">
                        {qIdx + 1}. {q.question}
                      </p>
                      <p className={`text-xs font-medium ${wasCorrect ? "text-emerald-600" : "text-rose-600"}`}>
                        Student's answer: {pickedIdx !== null && pickedIdx !== undefined ? q.options?.[pickedIdx] : "(no answer)"}{" "}
                        {wasCorrect ? "— Correct" : "— Incorrect"}
                      </p>
                      {!wasCorrect && correctIdx >= 0 && (
                        <p className="text-xs text-slate-500">Correct answer: {q.options?.[correctIdx]}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : submission.content ? (
              <div className="min-h-[300px] whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50 p-5 text-sm leading-relaxed text-slate-700">
                {submission.content}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-400">
                No written content submitted.
              </p>
            )}

            {submission.fileUrl && (
              <a
                href={submission.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                <Paperclip size={14} />
                View attached file
              </a>
            )}
          </div>

          {hasAnswerKey && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Answer Key</h2>
              <div className="whitespace-pre-wrap rounded-lg border border-indigo-100 bg-indigo-50/50 p-5 text-sm leading-relaxed text-slate-700">
                {assignment.answerKey}
              </div>
            </div>
          )}
        </div>

        <div>
          <GradingPanel
            submission={submission}
            maxPoints={maxPoints}
            hasAnswerKey={hasAnswerKey}
            answerKeyText={assignment.answerKey}
            rubricId={assignment.rubricId}
            onSaved={handleSaved}
          />
        </div>
      </div>
    </div>
  );
}
