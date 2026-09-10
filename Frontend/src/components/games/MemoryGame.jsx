import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Timer, CheckCircle2 } from "lucide-react";
import PrimaryButton from "../ui/PrimaryButton";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(pairs) {
  const deck = [];
  pairs.forEach((p, idx) => {
    deck.push({ cardId: `t-${idx}`, pairId: idx, label: p.term, kind: "term" });
    deck.push({ cardId: `m-${idx}`, pairId: idx, label: p.match, kind: "match" });
  });
  return shuffle(deck);
}

/**
 * Flip-card pair-matching game. config.pairs = [{ term, match }] (min 4).
 * Scored on matches-per-move: fewer wasted flips => higher score.
 */
export default function MemoryGame({ config, onComplete }) {
  const pairs = useMemo(() => (Array.isArray(config?.pairs) ? config.pairs : []), [config]);
  const [deck, setDeck] = useState(() => buildDeck(pairs));
  const [flipped, setFlipped] = useState([]); // up to 2 cardIds currently face-up (not yet matched)
  const [matchedPairIds, setMatchedPairIds] = useState(new Set());
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const [finished, setFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(null);

  const totalPairs = pairs.length;
  const isMatched = (cardId) => {
    const card = deck.find((c) => c.cardId === cardId);
    return card ? matchedPairIds.has(card.pairId) : false;
  };

  function resetGame() {
    setDeck(buildDeck(pairs));
    setFlipped([]);
    setMatchedPairIds(new Set());
    setMoves(0);
    setLocked(false);
    setFinished(false);
    setFinalScore(null);
  }

  function handleCardClick(cardId) {
    if (locked || finished) return;
    if (flipped.includes(cardId) || isMatched(cardId)) return;

    const next = [...flipped, cardId];
    setFlipped(next);

    if (next.length === 2) {
      setLocked(true);
      setMoves((m) => m + 1);
      const [aId, bId] = next;
      const a = deck.find((c) => c.cardId === aId);
      const b = deck.find((c) => c.cardId === bId);

      if (a && b && a.pairId === b.pairId && a.kind !== b.kind) {
        setTimeout(() => {
          setMatchedPairIds((prev) => {
            const updated = new Set(prev);
            updated.add(a.pairId);
            return updated;
          });
          setFlipped([]);
          setLocked(false);
        }, 450);
      } else {
        setTimeout(() => {
          setFlipped([]);
          setLocked(false);
        }, 800);
      }
    }
  }

  useEffect(() => {
    if (totalPairs > 0 && matchedPairIds.size === totalPairs && !finished) {
      const perfectMoves = totalPairs;
      const score = Math.max(10, Math.min(100, Math.round((perfectMoves / Math.max(moves, 1)) * 100)));
      setFinished(true);
      setFinalScore(score);
      onComplete?.(score);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedPairIds, totalPairs]);

  if (totalPairs < 1) {
    return <p className="text-sm text-slate-500">This memory game has no pairs configured.</p>;
  }

  const cols = deck.length <= 12 ? "grid-cols-4" : "grid-cols-5";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5 text-sm">
        <span className="font-medium text-slate-600">
          Pairs matched: <span className="text-slate-900">{matchedPairIds.size}</span> / {totalPairs}
        </span>
        <span className="flex items-center gap-1.5 font-medium text-slate-600">
          <Timer size={14} /> Moves: <span className="text-slate-900">{moves}</span>
        </span>
      </div>

      {finished ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 py-8 text-center">
          <CheckCircle2 className="text-emerald-600" size={32} />
          <p className="text-lg font-semibold text-emerald-800">Solved in {moves} moves!</p>
          <p className="text-sm text-emerald-700">Score submitted: {finalScore} / 100</p>
          <div className="w-40">
            <PrimaryButton onClick={resetGame} variant="outline">
              <RotateCcw size={14} /> Play Again
            </PrimaryButton>
          </div>
        </div>
      ) : (
        <div className={`grid ${cols} gap-3`}>
          {deck.map((card) => {
            const faceUp = flipped.includes(card.cardId) || isMatched(card.cardId);
            const matched = isMatched(card.cardId);
            return (
              <button
                key={card.cardId}
                type="button"
                onClick={() => handleCardClick(card.cardId)}
                disabled={matched}
                className={`flex aspect-square items-center justify-center rounded-xl border p-2 text-center text-xs font-semibold shadow-sm transition-all duration-200
                  ${matched
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : faceUp
                    ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                    : "border-slate-200 bg-gradient-to-br from-indigo-500 to-purple-600 text-white hover:brightness-110"}
                `}
              >
                {faceUp ? <span className="line-clamp-4">{card.label}</span> : <span className="text-xl">?</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
