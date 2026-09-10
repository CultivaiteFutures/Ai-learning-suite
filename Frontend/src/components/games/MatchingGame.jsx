import { useMemo, useState } from "react";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import PrimaryButton from "../ui/PrimaryButton";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Click-to-connect left/right matching exercise. config.pairs = [{ left, right }] (min 4).
 * Scored on accuracy: correct pairs vs. total attempts (wrong clicks cost accuracy).
 */
export default function MatchingGame({ config, onComplete }) {
  const pairs = useMemo(() => (Array.isArray(config?.pairs) ? config.pairs : []), [config]);
  const leftItems = useMemo(() => pairs.map((p, idx) => ({ id: idx, text: p.left })), [pairs]);
  const [rightItems, setRightItems] = useState(() => shuffle(pairs.map((p, idx) => ({ id: idx, text: p.right }))));
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [matched, setMatched] = useState(new Set());
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [wrongFlash, setWrongFlash] = useState(null); // { leftId, rightId }
  const [finished, setFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(null);

  const total = pairs.length;

  function resetGame() {
    setRightItems(shuffle(pairs.map((p, idx) => ({ id: idx, text: p.right }))));
    setSelectedLeft(null);
    setMatched(new Set());
    setWrongAttempts(0);
    setWrongFlash(null);
    setFinished(false);
    setFinalScore(null);
  }

  function finishIfComplete(nextMatched, attemptsSoFar) {
    if (nextMatched.size === total) {
      const accuracy = total / (total + attemptsSoFar);
      const score = Math.max(10, Math.min(100, Math.round(accuracy * 100)));
      setFinished(true);
      setFinalScore(score);
      onComplete?.(score);
    }
  }

  function handleLeftClick(leftId) {
    if (finished || matched.has(leftId)) return;
    setSelectedLeft(leftId);
  }

  function handleRightClick(rightId) {
    if (finished || selectedLeft === null || matched.has(selectedLeft)) return;

    if (selectedLeft === rightId) {
      const next = new Set(matched);
      next.add(selectedLeft);
      setMatched(next);
      setSelectedLeft(null);
      finishIfComplete(next, wrongAttempts);
    } else {
      setWrongFlash({ leftId: selectedLeft, rightId });
      setWrongAttempts((w) => w + 1);
      setTimeout(() => setWrongFlash(null), 500);
      setSelectedLeft(null);
    }
  }

  if (total < 1) {
    return <p className="text-sm text-slate-500">This matching game has no pairs configured.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5 text-sm">
        <span className="font-medium text-slate-600">
          Matched: <span className="text-slate-900">{matched.size}</span> / {total}
        </span>
        <span className="flex items-center gap-1.5 font-medium text-slate-600">
          <XCircle size={14} className="text-rose-400" /> Wrong attempts: <span className="text-slate-900">{wrongAttempts}</span>
        </span>
      </div>

      {finished ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 py-8 text-center">
          <CheckCircle2 className="text-emerald-600" size={32} />
          <p className="text-lg font-semibold text-emerald-800">All matched!</p>
          <p className="text-sm text-emerald-700">Score submitted: {finalScore} / 100</p>
          <div className="w-40">
            <PrimaryButton onClick={resetGame} variant="outline">
              <RotateCcw size={14} /> Play Again
            </PrimaryButton>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2.5">
            {leftItems.map((item) => {
              const isMatched = matched.has(item.id);
              const isSelected = selectedLeft === item.id;
              const isWrong = wrongFlash?.leftId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={isMatched}
                  onClick={() => handleLeftClick(item.id)}
                  className={`w-full rounded-lg border px-4 py-3 text-left text-sm font-medium shadow-sm transition-colors
                    ${isMatched
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : isWrong
                      ? "border-rose-300 bg-rose-50 text-rose-700"
                      : isSelected
                      ? "border-indigo-500 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-200"
                      : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50"}
                  `}
                >
                  {item.text}
                </button>
              );
            })}
          </div>
          <div className="space-y-2.5">
            {rightItems.map((item) => {
              const isMatched = matched.has(item.id);
              const isWrong = wrongFlash?.rightId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={isMatched}
                  onClick={() => handleRightClick(item.id)}
                  className={`w-full rounded-lg border px-4 py-3 text-left text-sm font-medium shadow-sm transition-colors
                    ${isMatched
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : isWrong
                      ? "border-rose-300 bg-rose-50 text-rose-700"
                      : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50"}
                  `}
                >
                  {item.text}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!finished && (
        <p className="text-center text-xs text-slate-400">Click an item on the left, then its match on the right.</p>
      )}
    </div>
  );
}
