import { useMemo, useState } from "react";
import { CheckCircle2, RotateCcw, RotateCw, ThumbsDown, ThumbsUp } from "lucide-react";
import PrimaryButton from "../ui/PrimaryButton";

/**
 * Flip-through flashcard review with self-graded outcome. config.cards =
 * [{ front, back }]. Score = percentage the student marked "Got it".
 */
export default function FlashcardGame({ config, onComplete }) {
  const cards = useMemo(() => (Array.isArray(config?.cards) ? config.cards : []), [config]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [gotItCount, setGotItCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(null);

  if (cards.length < 1) {
    return <p className="text-sm text-slate-500">This flashcard set has no cards configured.</p>;
  }

  const current = cards[index];

  function resetGame() {
    setIndex(0);
    setFlipped(false);
    setGotItCount(0);
    setFinished(false);
    setFinalScore(null);
  }

  function handleGrade(gotIt) {
    const nextGotIt = gotIt ? gotItCount + 1 : gotItCount;
    if (index + 1 >= cards.length) {
      const score = Math.round((nextGotIt / cards.length) * 100);
      setGotItCount(nextGotIt);
      setFinished(true);
      setFinalScore(score);
      onComplete?.(score);
    } else {
      setGotItCount(nextGotIt);
      setIndex((i) => i + 1);
      setFlipped(false);
    }
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 py-8 text-center">
        <CheckCircle2 className="text-emerald-600" size={32} />
        <p className="text-lg font-semibold text-emerald-800">
          {gotItCount} / {cards.length} marked "Got it"
        </p>
        <p className="text-sm text-emerald-700">Score submitted: {finalScore} / 100</p>
        <div className="w-40">
          <PrimaryButton onClick={resetGame} variant="outline">
            <RotateCcw size={14} /> Review Again
          </PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
        <span>Card {index + 1} of {cards.length}</span>
        <span>Got it so far: {gotItCount}</span>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="flex min-h-[180px] w-full flex-col items-center justify-center gap-3 rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 px-6 py-10 text-center shadow-sm transition hover:shadow-md"
      >
        <p className="text-lg font-semibold text-slate-900">{flipped ? current.back : current.front}</p>
        <span className="flex items-center gap-1 text-xs font-medium text-indigo-500">
          <RotateCw size={12} /> {flipped ? "Showing answer -- click to flip back" : "Click to reveal answer"}
        </span>
      </button>

      {flipped && (
        <div className="flex justify-center gap-3">
          <div className="w-40">
            <PrimaryButton onClick={() => handleGrade(false)} variant="outline">
              <ThumbsDown size={14} /> Missed it
            </PrimaryButton>
          </div>
          <div className="w-40">
            <PrimaryButton onClick={() => handleGrade(true)}>
              <ThumbsUp size={14} /> Got it
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}
