import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, XCircle, RotateCcw, Clock, Zap } from "lucide-react";
import PrimaryButton from "../ui/PrimaryButton";

const SECONDS_PER_QUESTION = 15;

/**
 * Trivia-show style multiple-choice flow: each question has a countdown timer,
 * running unanswered when time expires counts as wrong. config.questions =
 * [{ question, options, correct_index }] -- same shape as quiz_match.
 */
export default function TriviaGame({ config, onComplete }) {
  const questions = useMemo(() => (Array.isArray(config?.questions) ? config.questions : []), [config]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_QUESTION);
  const [finished, setFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(null);

  const current = questions[index];
  const correctIndex = current?.correct_index ?? current?.correctIndex ?? -1;

  useEffect(() => {
    if (!current || answered || finished) return undefined;
    if (timeLeft <= 0) {
      setAnswered(true);
      return undefined;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, answered, finished, current]);

  if (questions.length < 1) {
    return <p className="text-sm text-slate-500">This trivia round has no questions configured.</p>;
  }

  function resetGame() {
    setIndex(0);
    setSelected(null);
    setAnswered(false);
    setCorrectCount(0);
    setTimeLeft(SECONDS_PER_QUESTION);
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
      setTimeLeft(SECONDS_PER_QUESTION);
    }
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 py-8 text-center">
        <Zap className="text-amber-500" size={32} />
        <p className="text-lg font-semibold text-amber-800">
          {correctCount} / {questions.length} correct
        </p>
        <p className="text-sm text-amber-700">Score submitted: {finalScore} / 100</p>
        <div className="w-40">
          <PrimaryButton onClick={resetGame} variant="outline">
            <RotateCcw size={14} /> Play Again
          </PrimaryButton>
        </div>
      </div>
    );
  }

  const timeUrgent = timeLeft <= 5;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
        <span>Question {index + 1} of {questions.length}</span>
        <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${timeUrgent ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-600"}`}>
          <Clock size={12} /> {answered ? "--" : `${timeLeft}s`}
        </span>
      </div>

      <p className="text-base font-semibold text-slate-900">{current.question}</p>

      <div className="space-y-2.5">
        {(current.options || []).map((opt, optIdx) => {
          const isCorrectOpt = optIdx === correctIndex;
          const isSelectedOpt = optIdx === selected;
          let styles = "border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50/50";
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

      {selected === null && answered && (
        <p className="text-sm font-medium text-rose-600">Time's up!</p>
      )}

      {answered && (
        <div className="flex justify-end">
          <div className="w-40">
            <PrimaryButton onClick={handleNext}>
              {index + 1 >= questions.length ? "Finish" : "Next"}
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}
