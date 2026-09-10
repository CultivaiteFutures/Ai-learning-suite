import { useMemo, useState } from "react";
import { CheckCircle2, XCircle, ArrowRight, Award } from "lucide-react";
import PrimaryButton from "../ui/PrimaryButton";

/**
 * Self-contained quiz player for a real auto-graded Assignment (type "Quiz"
 * with config.questions set). Deliberately NOT shared with, or imported
 * from, the Fun Games module (components/games/QuizMatchGame.jsx) -- Fun
 * Games and Assignments are separate systems that happen to reuse the same
 * {question, options, correct_index} question shape for consistency.
 *
 * Key difference from QuizMatchGame: the real grade always comes from the
 * server (student.py computes it from the real answer key), so this
 * component's only job is to walk the student through the questions and
 * hand back the RAW selected option index per question -- never a
 * client-computed score.
 *
 * Props:
 *   - questions: config.questions, i.e. [{ question, options, correct_index }]
 *   - onFinish(answersArray): called once, after the last question, with the
 *     selected option index per question in order (null if left unanswered,
 *     though the UI requires an answer before advancing).
 */
export default function AssignmentQuizPlayer({ questions, onFinish }) {
  const safeQuestions = useMemo(() => (Array.isArray(questions) ? questions : []), [questions]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState(() => safeQuestions.map(() => null));
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);

  if (safeQuestions.length < 1) {
    return <p className="text-sm text-slate-500">This quiz has no questions configured.</p>;
  }

  const current = safeQuestions[index];
  const correctIndex = current.correct_index ?? current.correctIndex ?? -1;
  const isLast = index + 1 >= safeQuestions.length;

  function handleSelect(optIdx) {
    if (answered) return;
    setSelected(optIdx);
    setAnswered(true);
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = optIdx;
      return next;
    });
  }

  function handleNext() {
    if (isLast) {
      const finalAnswers = [...answers];
      finalAnswers[index] = selected;
      onFinish?.(finalAnswers);
    } else {
      setIndex((i) => i + 1);
      setSelected(null);
      setAnswered(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <span>
            Question {index + 1} of {safeQuestions.length}
          </span>
          <span className="flex items-center gap-1">
            <Award size={13} /> Instant grading -- one attempt only
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all"
            style={{ width: `${(index / safeQuestions.length) * 100}%` }}
          />
        </div>
      </div>

      <p className="text-base font-semibold text-slate-900">{current.question}</p>

      <div className="space-y-2.5">
        {(current.options || []).map((opt, optIdx) => {
          const isCorrectOpt = optIdx === correctIndex;
          const isSelectedOpt = optIdx === selected;
          let styles = "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50";
          if (answered) {
            if (isCorrectOpt) styles = "border-emerald-300 bg-emerald-50 text-emerald-700";
            else if (isSelectedOpt) styles = "border-rose-300 bg-rose-50 text-rose-700";
            else styles = "border-slate-200 bg-slate-50 text-slate-400";
          }
          return (
            <button
              key={optIdx}
              type="button"
              disabled={answered}
              onClick={() => handleSelect(optIdx)}
              className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-medium shadow-sm transition-colors ${styles}`}
            >
              <span>{opt}</span>
              {answered && isCorrectOpt && <CheckCircle2 size={16} className="text-emerald-600" />}
              {answered && isSelectedOpt && !isCorrectOpt && <XCircle size={16} className="text-rose-600" />}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="flex justify-end">
          <div className="w-40">
            <PrimaryButton onClick={handleNext}>
              {isLast ? "Finish Quiz" : "Next"} <ArrowRight size={14} />
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}
