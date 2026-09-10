import { useMemo, useState } from "react";
import { CheckCircle2, XCircle, RotateCcw, ArrowRight } from "lucide-react";
import PrimaryButton from "../ui/PrimaryButton";

/**
 * Straightforward multiple-choice quiz flow with immediate per-answer feedback
 * and a running score bar. config.questions = [{ question, options, correct_index }].
 */
export default function QuizMatchGame({ config, onComplete }) {
  const questions = useMemo(() => (Array.isArray(config?.questions) ? config.questions : []), [config]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(null);

  if (questions.length < 1) {
    return <p className="text-sm text-slate-500">This quiz has no questions configured.</p>;
  }

  const current = questions[index];
  const correctIndex = current.correct_index ?? current.correctIndex ?? -1;

  function resetGame() {
    setIndex(0);
    setSelected(null);
    setAnswered(false);
    setCorrectCount(0);
    setFinished(false);
    setFinalScore(null);
  }

  function handleSelect(optIdx) {
    if (answered) return;
    setSelected(optIdx);
    setAnswered(true);
    if (optIdx === correctIndex) setCorrectCount((c) => c + 1);
  }

  function handleNext() {
    if (index + 1 >= questions.length) {
      const score = Math.round((correctCount / questions.length) * 100);
      setFinished(true);
      setFinalScore(score);
      onComplete?.(score);
    } else {
      setIndex((i) => i + 1);
      setSelected(null);
      setAnswered(false);
    }
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 py-8 text-center">
        <CheckCircle2 className="text-emerald-600" size={32} />
        <p className="text-lg font-semibold text-emerald-800">
          {correctCount} / {questions.length} correct
        </p>
        <p className="text-sm text-emerald-700">Score submitted: {finalScore} / 100</p>
        <div className="w-40">
          <PrimaryButton onClick={resetGame} variant="outline">
            <RotateCcw size={14} /> Play Again
          </PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <span>Question {index + 1} of {questions.length}</span>
          <span>Correct so far: {correctCount}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all"
            style={{ width: `${(index / questions.length) * 100}%` }}
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
              {index + 1 >= questions.length ? "Finish" : "Next"} <ArrowRight size={14} />
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}
