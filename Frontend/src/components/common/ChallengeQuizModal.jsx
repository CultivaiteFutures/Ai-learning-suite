import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Zap, Award } from "lucide-react";
import Modal from "../ui/Modal";
import PrimaryButton from "../ui/PrimaryButton";
import { challengesAPI } from "../../services/api";

/**
 * Student's "take the quiz" flow for one Challenge. Fetches the full
 * challenge (sanitized -- no answer key -- until this student has already
 * submitted, per GET /challenges/{id}), lets them answer every
 * multiple-choice / true-false question, then submits for instant
 * auto-grading via POST /challenges/{id}/submit.
 *
 * If the student already submitted (challengeSummary.hasSubmitted), this
 * opens straight into the results view instead of a blank quiz, using the
 * answer key GET /challenges/{id} now includes for a submitted student.
 */
export default function ChallengeQuizModal({ isOpen, onClose, challengeSummary, onSubmitted }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState({}); // questionId -> { selectedIndex } | { selectedAnswer }
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!isOpen || !challengeSummary) return;
    setLoading(true);
    setError("");
    setResult(null);
    setAnswers({});
    challengesAPI
      .getChallenge(challengeSummary.id)
      .then((res) => setDetail(res.data))
      .catch(() => setError("Could not load this challenge."))
      .finally(() => setLoading(false));
  }, [isOpen, challengeSummary]);

  function setMcqAnswer(questionId, index) {
    setAnswers((prev) => ({ ...prev, [questionId]: { questionId, selectedIndex: index } }));
  }

  function setTfAnswer(questionId, value) {
    setAnswers((prev) => ({ ...prev, [questionId]: { questionId, selectedAnswer: value } }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await challengesAPI.submitChallenge(detail.id, { answers: Object.values(answers) });
      setResult(res.data);
      onSubmitted?.(detail.id, res.data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not submit this challenge.");
    } finally {
      setSubmitting(false);
    }
  }

  const questions = detail?.questions || [];
  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id] !== undefined);
  const alreadySubmitted = detail?.hasSubmitted;

  // Once already submitted (either from a prior session, or right after this
  // submit call resolves), the detail response's own questions carry the
  // answer key -- build a results view from those instead of a separate payload.
  const reviewResults = result
    ? result.results
    : alreadySubmitted
    ? questions.map((q) => ({
        questionId: q.id,
        correct: undefined,
        correctIndex: q.correctIndex,
        correctAnswer: q.correctAnswer,
      }))
    : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={challengeSummary?.title || "Challenge"} maxWidth="max-w-2xl">
      {loading ? (
        <p className="py-8 text-center text-sm text-slate-400">Loading...</p>
      ) : error && !detail ? (
        <p className="py-8 text-center text-sm text-rose-500">{error}</p>
      ) : result ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                You scored {result.score}/{result.maxScore} ({result.correctCount}/{result.totalQuestions} correct)
              </p>
              {result.bonusXpAwarded > 0 && (
                <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <Zap size={12} /> +{result.bonusXpAwarded} bonus XP earned
                </p>
              )}
            </div>
          </div>
          <QuestionReview questions={questions} results={result.results} />
          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Done
            </button>
          </div>
        </div>
      ) : alreadySubmitted ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <Award size={22} />
            </div>
            <p className="text-sm font-semibold text-indigo-800">
              You already completed this challenge{detail?.myScore !== null && detail?.myScore !== undefined ? ` -- score: ${detail.myScore}` : ""}.
            </p>
          </div>
          <QuestionReview questions={questions} results={reviewResults} showSelected={false} />
          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Close
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {detail?.description && <p className="text-sm text-slate-600">{detail.description}</p>}
          {error && <p className="text-sm font-medium text-rose-600">{error}</p>}

          <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
            {questions.map((q, qIndex) => (
              <div key={q.id} className="rounded-lg border border-slate-200 p-3.5">
                <p className="text-sm font-medium text-slate-800">
                  {qIndex + 1}. {q.text}
                </p>
                <div className="mt-2.5 space-y-1.5">
                  {q.type === "mcq"
                    ? q.options.map((opt, oIndex) => (
                        <label
                          key={oIndex}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <input
                            type="radio"
                            name={`answer-${q.id}`}
                            checked={answers[q.id]?.selectedIndex === oIndex}
                            onChange={() => setMcqAnswer(q.id, oIndex)}
                          />
                          {opt}
                        </label>
                      ))
                    : [true, false].map((val) => (
                        <label
                          key={String(val)}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <input
                            type="radio"
                            name={`answer-${q.id}`}
                            checked={answers[q.id]?.selectedAnswer === val}
                            onChange={() => setTfAnswer(q.id, val)}
                          />
                          {val ? "True" : "False"}
                        </label>
                      ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <div className="w-40">
              <PrimaryButton onClick={handleSubmit} loading={submitting} disabled={!allAnswered}>
                Submit Quiz
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function QuestionReview({ questions, results, showSelected = true }) {
  const byId = Object.fromEntries((results || []).map((r) => [r.questionId, r]));
  return (
    <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
      {questions.map((q, qIndex) => {
        const r = byId[q.id];
        const correctLabel =
          q.type === "mcq"
            ? q.options?.[r?.correctIndex]
            : r?.correctAnswer
            ? "True"
            : "False";
        return (
          <div key={q.id} className="rounded-lg border border-slate-200 p-3.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-slate-800">
                {qIndex + 1}. {q.text}
              </p>
              {showSelected && r && (
                <span className="shrink-0">
                  {r.correct ? (
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  ) : (
                    <XCircle size={16} className="text-rose-500" />
                  )}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Correct answer: <span className="font-medium text-slate-700">{correctLabel}</span>
            </p>
          </div>
        );
      })}
    </div>
  );
}
