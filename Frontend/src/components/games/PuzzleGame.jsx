import { useMemo, useState } from "react";
import { CheckCircle2, RotateCcw, ArrowRight, XCircle } from "lucide-react";
import PrimaryButton from "../ui/PrimaryButton";
import InputField from "../ui/InputField";

function scrambleWord(word) {
  const letters = word.split("");
  let attempt = letters;
  // Re-shuffle until it differs from the original (for words > 1 letter).
  for (let tries = 0; tries < 8; tries++) {
    const copy = [...letters];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    attempt = copy;
    if (attempt.join("") !== word || word.length <= 1) break;
  }
  return attempt.join("");
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function buildWordSearchGrid(words) {
  const size = Math.max(10, Math.min(14, Math.max(...words.map((w) => w.length)) + 3));
  const grid = Array.from({ length: size }, () => Array(size).fill(null));
  const placements = []; // { word, cells: [{r,c}] }

  const directions = [
    { dr: 0, dc: 1 }, // horizontal
    { dr: 1, dc: 0 }, // vertical
  ];

  words.forEach((rawWord) => {
    const word = rawWord.toUpperCase().replace(/[^A-Z]/g, "");
    if (!word) return;
    let placed = false;
    for (let attempt = 0; attempt < 60 && !placed; attempt++) {
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const reversed = Math.random() < 0.5;
      const seq = reversed ? word.split("").reverse().join("") : word;
      const maxRow = dir.dr === 1 ? size - seq.length : size - 1;
      const maxCol = dir.dc === 1 ? size - seq.length : size - 1;
      if (maxRow < 0 || maxCol < 0) continue;
      const startRow = Math.floor(Math.random() * (maxRow + 1));
      const startCol = Math.floor(Math.random() * (maxCol + 1));

      const cells = [];
      let fits = true;
      for (let i = 0; i < seq.length; i++) {
        const r = startRow + dir.dr * i;
        const c = startCol + dir.dc * i;
        const existing = grid[r][c];
        if (existing && existing !== seq[i]) {
          fits = false;
          break;
        }
        cells.push({ r, c });
      }
      if (!fits) continue;

      cells.forEach(({ r, c }, i) => {
        grid[r][c] = seq[i];
      });
      placements.push({ word, cells });
      placed = true;
    }
  });

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) grid[r][c] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
  }

  return { grid, size, placements };
}

function cellKey(r, c) {
  return `${r}-${c}`;
}

/**
 * Word puzzle: "word_scramble" (unscramble typed letters) or "word_search"
 * (click the first and last letter of a straight-line word in the grid).
 * config.words = [string, ...] (min 4), optional config.puzzle_type.
 */
export default function PuzzleGame({ config, onComplete }) {
  const words = useMemo(
    () => (Array.isArray(config?.words) ? config.words.filter((w) => typeof w === "string" && w.trim()) : []),
    [config]
  );
  const puzzleType = config?.puzzle_type || config?.puzzleType || "word_scramble";

  if (words.length < 1) {
    return <p className="text-sm text-slate-500">This puzzle has no words configured.</p>;
  }

  return puzzleType === "word_search" ? (
    <WordSearchPuzzle words={words} onComplete={onComplete} />
  ) : (
    <WordScramblePuzzle words={words} onComplete={onComplete} />
  );
}

function WordScramblePuzzle({ words, onComplete }) {
  const scrambled = useMemo(() => words.map((w) => scrambleWord(w.toUpperCase())), [words]);
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState("");
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState(null); // "correct" | "wrong" | null
  const [triesThisWord, setTriesThisWord] = useState(0);
  const [finished, setFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(null);

  function resetGame() {
    setIndex(0);
    setGuess("");
    setCorrectCount(0);
    setFeedback(null);
    setTriesThisWord(0);
    setFinished(false);
    setFinalScore(null);
  }

  function nextOrFinish(nextCorrectCount) {
    if (index + 1 >= words.length) {
      const score = Math.round((nextCorrectCount / words.length) * 100);
      setFinished(true);
      setFinalScore(score);
      onComplete?.(score);
    } else {
      setIndex((i) => i + 1);
      setGuess("");
      setFeedback(null);
      setTriesThisWord(0);
    }
  }

  function handleSubmitGuess(e) {
    e.preventDefault();
    const target = words[index].toUpperCase().trim();
    if (guess.trim().toUpperCase() === target) {
      setFeedback("correct");
      const nextCorrect = correctCount + 1;
      setCorrectCount(nextCorrect);
      setTimeout(() => nextOrFinish(nextCorrect), 600);
    } else if (triesThisWord >= 1) {
      // Two wrong tries -> move on without credit
      setFeedback("wrong");
      setTimeout(() => nextOrFinish(correctCount), 700);
    } else {
      setFeedback("wrong");
      setTriesThisWord((t) => t + 1);
      setTimeout(() => setFeedback(null), 600);
    }
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 py-8 text-center">
        <CheckCircle2 className="text-emerald-600" size={32} />
        <p className="text-lg font-semibold text-emerald-800">
          {correctCount} / {words.length} words unscrambled
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
      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5 text-sm">
        <span className="font-medium text-slate-600">
          Word <span className="text-slate-900">{index + 1}</span> / {words.length}
        </span>
        <span className="font-medium text-slate-600">
          Correct: <span className="text-slate-900">{correctCount}</span>
        </span>
      </div>

      <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 py-8 text-center">
        <p className="text-3xl font-bold tracking-[0.3em] text-indigo-800">{scrambled[index]}</p>
      </div>

      <form onSubmit={handleSubmitGuess} className="flex items-end gap-3">
        <div className="flex-1">
          <InputField
            label="Unscramble it"
            name="guess"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="Type your answer..."
            autoComplete="off"
          />
        </div>
        <div className="w-32">
          <PrimaryButton type="submit" disabled={!guess.trim()}>
            <ArrowRight size={14} /> Submit
          </PrimaryButton>
        </div>
      </form>

      {feedback === "correct" && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
          <CheckCircle2 size={14} /> Correct!
        </p>
      )}
      {feedback === "wrong" && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-rose-600">
          <XCircle size={14} /> {triesThisWord >= 1 ? "Not quite -- moving on." : "Not quite, try again."}
        </p>
      )}
    </div>
  );
}

function WordSearchPuzzle({ words, onComplete }) {
  const { grid, size, placements } = useMemo(() => buildWordSearchGrid(words), [words]);
  const [selectionStart, setSelectionStart] = useState(null);
  const [foundWords, setFoundWords] = useState(new Set());
  const [foundCells, setFoundCells] = useState(new Set());
  const [wrongFlashCells, setWrongFlashCells] = useState(new Set());
  const [finished, setFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(null);

  const totalPlaceable = placements.length;

  function resetGame() {
    setSelectionStart(null);
    setFoundWords(new Set());
    setFoundCells(new Set());
    setWrongFlashCells(new Set());
    setFinished(false);
    setFinalScore(null);
  }

  function cellsBetween(r1, c1, r2, c2) {
    if (r1 === r2) {
      const [lo, hi] = c1 < c2 ? [c1, c2] : [c2, c1];
      return Array.from({ length: hi - lo + 1 }, (_, i) => ({ r: r1, c: lo + i }));
    }
    if (c1 === c2) {
      const [lo, hi] = r1 < r2 ? [r1, r2] : [r2, r1];
      return Array.from({ length: hi - lo + 1 }, (_, i) => ({ r: lo + i, c: c1 }));
    }
    return null; // not a straight line
  }

  function handleCellClick(r, c) {
    if (finished) return;
    if (!selectionStart) {
      setSelectionStart({ r, c });
      return;
    }
    const line = cellsBetween(selectionStart.r, selectionStart.c, r, c);
    setSelectionStart(null);
    if (!line) return;

    const match = placements.find((p) => {
      if (foundWords.has(p.word)) return false;
      if (p.cells.length !== line.length) return false;
      const sameForward = p.cells.every((cell, i) => cell.r === line[i].r && cell.c === line[i].c);
      const sameBackward = p.cells.every((cell, i) => cell.r === line[line.length - 1 - i].r && cell.c === line[line.length - 1 - i].c);
      return sameForward || sameBackward;
    });

    if (match) {
      const nextFound = new Set(foundWords);
      nextFound.add(match.word);
      setFoundWords(nextFound);
      setFoundCells((prev) => {
        const next = new Set(prev);
        match.cells.forEach((cell) => next.add(cellKey(cell.r, cell.c)));
        return next;
      });
      if (nextFound.size === totalPlaceable) {
        const score = 100;
        setFinished(true);
        setFinalScore(score);
        onComplete?.(score);
      }
    } else {
      const keys = new Set(line.map((cell) => cellKey(cell.r, cell.c)));
      setWrongFlashCells(keys);
      setTimeout(() => setWrongFlashCells(new Set()), 400);
    }
  }

  if (totalPlaceable < 1) {
    return <p className="text-sm text-slate-500">Couldn't fit any words into the search grid. Try shorter words.</p>;
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 py-8 text-center">
        <CheckCircle2 className="text-emerald-600" size={32} />
        <p className="text-lg font-semibold text-emerald-800">All {totalPlaceable} words found!</p>
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
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5 text-sm">
        <span className="font-medium text-slate-600">
          Found: <span className="text-slate-900">{foundWords.size}</span> / {totalPlaceable}
        </span>
        <span className="text-xs text-slate-400">Click the first letter, then the last letter of a word.</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {placements.map((p) => (
          <span
            key={p.word}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              foundWords.has(p.word) ? "bg-emerald-100 text-emerald-700 line-through" : "bg-slate-100 text-slate-600"
            }`}
          >
            {p.word}
          </span>
        ))}
      </div>

      <div
        className="mx-auto grid w-fit gap-0.5 rounded-lg border border-slate-200 bg-white p-2 shadow-sm"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {grid.map((row, r) =>
          row.map((letter, c) => {
            const key = cellKey(r, c);
            const isFound = foundCells.has(key);
            const isSelected = selectionStart?.r === r && selectionStart?.c === c;
            const isWrong = wrongFlashCells.has(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleCellClick(r, c)}
                className={`flex h-7 w-7 items-center justify-center rounded text-[11px] font-semibold transition-colors sm:h-8 sm:w-8
                  ${isFound
                    ? "bg-emerald-100 text-emerald-700"
                    : isWrong
                    ? "bg-rose-100 text-rose-600"
                    : isSelected
                    ? "bg-indigo-500 text-white"
                    : "bg-slate-50 text-slate-700 hover:bg-indigo-50"}
                `}
              >
                {letter}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
