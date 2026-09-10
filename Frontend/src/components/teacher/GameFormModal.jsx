import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Modal from "../ui/Modal";
import InputField from "../ui/InputField";
import SelectField from "../ui/SelectField";
import PrimaryButton from "../ui/PrimaryButton";

const GAME_TYPE_OPTIONS = [
  { value: "quiz_match", label: "Quiz Match" },
  { value: "trivia", label: "Trivia" },
  { value: "flashcard", label: "Flashcards" },
  { value: "memory", label: "Memory Match" },
  { value: "matching", label: "Matching" },
  { value: "puzzle", label: "Word Puzzle" },
];

const MIN_PAIRS = 4;
const MIN_WORDS = 4;

function emptyQuestion() {
  return { question: "", options: ["", ""], correctIndex: 0 };
}
function emptyCard() {
  return { front: "", back: "" };
}
function emptyTermMatchPair() {
  return { term: "", match: "" };
}
function emptyLeftRightPair() {
  return { left: "", right: "" };
}

function buildDefaultConfigState() {
  return {
    questions: [emptyQuestion()],
    cards: [emptyCard()],
    memoryPairs: Array.from({ length: MIN_PAIRS }, emptyTermMatchPair),
    matchingPairs: Array.from({ length: MIN_PAIRS }, emptyLeftRightPair),
    words: Array.from({ length: MIN_WORDS }, () => ""),
    puzzleType: "word_scramble",
  };
}

function configStateFromGame(gameType, config) {
  const base = buildDefaultConfigState();
  if (!config || typeof config !== "object") return base;

  if ((gameType === "quiz_match" || gameType === "trivia") && Array.isArray(config.questions) && config.questions.length) {
    base.questions = config.questions.map((q) => ({
      question: q.question || "",
      options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ["", ""],
      correctIndex: q.correct_index ?? q.correctIndex ?? 0,
    }));
  }
  if (gameType === "flashcard" && Array.isArray(config.cards) && config.cards.length) {
    base.cards = config.cards.map((c) => ({ front: c.front || "", back: c.back || "" }));
  }
  if (gameType === "memory" && Array.isArray(config.pairs) && config.pairs.length) {
    base.memoryPairs = config.pairs.map((p) => ({ term: p.term || "", match: p.match || "" }));
  }
  if (gameType === "matching" && Array.isArray(config.pairs) && config.pairs.length) {
    base.matchingPairs = config.pairs.map((p) => ({ left: p.left || "", right: p.right || "" }));
  }
  if (gameType === "puzzle" && Array.isArray(config.words) && config.words.length) {
    base.words = config.words;
    base.puzzleType = config.puzzle_type || config.puzzleType || "word_scramble";
  }
  return base;
}

function buildConfigPayload(gameType, state) {
  if (gameType === "quiz_match" || gameType === "trivia") {
    return {
      questions: state.questions.map((q) => ({
        question: q.question.trim(),
        options: q.options.map((o) => o.trim()),
        correct_index: q.correctIndex,
      })),
    };
  }
  if (gameType === "flashcard") {
    return { cards: state.cards.map((c) => ({ front: c.front.trim(), back: c.back.trim() })) };
  }
  if (gameType === "memory") {
    return { pairs: state.memoryPairs.map((p) => ({ term: p.term.trim(), match: p.match.trim() })) };
  }
  if (gameType === "matching") {
    return { pairs: state.matchingPairs.map((p) => ({ left: p.left.trim(), right: p.right.trim() })) };
  }
  if (gameType === "puzzle") {
    return { words: state.words.map((w) => w.trim()), puzzle_type: state.puzzleType };
  }
  return {};
}

/**
 * Create/edit form for the Fun Games module. Structured, per-type content
 * authoring inputs (add/remove rows) for every type -- no raw JSON textarea.
 */
export default function GameFormModal({ isOpen, onClose, onSave, initialData, courses, saving, error }) {
  const [title, setTitle] = useState("");
  const [gameType, setGameType] = useState("quiz_match");
  const [courseId, setCourseId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [configState, setConfigState] = useState(buildDefaultConfigState());
  const [formError, setFormError] = useState("");

  const selectedCourse = courses.find((c) => c.id === courseId);
  const lessons = useMemo(
    () => (selectedCourse?.modules || []).flatMap((m) => (m.lessons || []).map((l) => ({ ...l, moduleTitle: m.title }))),
    [selectedCourse]
  );

  useEffect(() => {
    if (!isOpen) return;
    setFormError("");
    if (initialData) {
      const gt = initialData.gameType || initialData.game_type || "quiz_match";
      setTitle(initialData.title || "");
      setGameType(gt);
      setCourseId(initialData.courseId || initialData.course_id || "");
      setLessonId(initialData.lessonId || initialData.lesson_id || "");
      setIsPublished(initialData.isPublished ?? initialData.is_published ?? true);
      setConfigState(configStateFromGame(gt, initialData.config));
    } else {
      setTitle("");
      setGameType("quiz_match");
      setCourseId(courses[0]?.id || "");
      setLessonId("");
      setIsPublished(true);
      setConfigState(buildDefaultConfigState());
    }
  }, [isOpen, initialData]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleGameTypeChange(e) {
    setGameType(e.target.value);
  }

  // ---- Questions (quiz_match / trivia) ----
  function updateQuestion(idx, field, value) {
    setConfigState((prev) => {
      const questions = [...prev.questions];
      questions[idx] = { ...questions[idx], [field]: value };
      return { ...prev, questions };
    });
  }
  function updateOption(qIdx, optIdx, value) {
    setConfigState((prev) => {
      const questions = [...prev.questions];
      const options = [...questions[qIdx].options];
      options[optIdx] = value;
      questions[qIdx] = { ...questions[qIdx], options };
      return { ...prev, questions };
    });
  }
  function addOption(qIdx) {
    setConfigState((prev) => {
      const questions = [...prev.questions];
      questions[qIdx] = { ...questions[qIdx], options: [...questions[qIdx].options, ""] };
      return { ...prev, questions };
    });
  }
  function removeOption(qIdx, optIdx) {
    setConfigState((prev) => {
      const questions = [...prev.questions];
      const options = questions[qIdx].options.filter((_, i) => i !== optIdx);
      let correctIndex = questions[qIdx].correctIndex;
      if (correctIndex >= options.length) correctIndex = 0;
      questions[qIdx] = { ...questions[qIdx], options, correctIndex };
      return { ...prev, questions };
    });
  }
  function addQuestion() {
    setConfigState((prev) => ({ ...prev, questions: [...prev.questions, emptyQuestion()] }));
  }
  function removeQuestion(idx) {
    setConfigState((prev) => ({ ...prev, questions: prev.questions.filter((_, i) => i !== idx) }));
  }

  // ---- Flashcards ----
  function updateCard(idx, field, value) {
    setConfigState((prev) => {
      const cards = [...prev.cards];
      cards[idx] = { ...cards[idx], [field]: value };
      return { ...prev, cards };
    });
  }
  function addCard() {
    setConfigState((prev) => ({ ...prev, cards: [...prev.cards, emptyCard()] }));
  }
  function removeCard(idx) {
    setConfigState((prev) => ({ ...prev, cards: prev.cards.filter((_, i) => i !== idx) }));
  }

  // ---- Memory / Matching pairs (shared shape helpers, different field names) ----
  function updatePair(listKey, idx, field, value) {
    setConfigState((prev) => {
      const list = [...prev[listKey]];
      list[idx] = { ...list[idx], [field]: value };
      return { ...prev, [listKey]: list };
    });
  }
  function addPair(listKey, factory) {
    setConfigState((prev) => ({ ...prev, [listKey]: [...prev[listKey], factory()] }));
  }
  function removePair(listKey, idx) {
    setConfigState((prev) => ({ ...prev, [listKey]: prev[listKey].filter((_, i) => i !== idx) }));
  }

  // ---- Puzzle words ----
  function updateWord(idx, value) {
    setConfigState((prev) => {
      const words = [...prev.words];
      words[idx] = value;
      return { ...prev, words };
    });
  }
  function addWord() {
    setConfigState((prev) => ({ ...prev, words: [...prev.words, ""] }));
  }
  function removeWord(idx) {
    setConfigState((prev) => ({ ...prev, words: prev.words.filter((_, i) => i !== idx) }));
  }

  function validate() {
    if (!title.trim()) return "Title is required.";
    if (!courseId) return "Select a course.";
    if (gameType === "quiz_match" || gameType === "trivia") {
      if (configState.questions.some((q) => !q.question.trim() || q.options.some((o) => !o.trim()) || q.options.length < 2)) {
        return "Every question needs text and at least 2 non-empty options.";
      }
    }
    if (gameType === "flashcard") {
      if (configState.cards.some((c) => !c.front.trim() || !c.back.trim())) {
        return "Every flashcard needs both a front and a back.";
      }
    }
    if (gameType === "memory") {
      if (configState.memoryPairs.length < MIN_PAIRS) return `Memory games need at least ${MIN_PAIRS} pairs.`;
      if (configState.memoryPairs.some((p) => !p.term.trim() || !p.match.trim())) return "Every memory pair needs a term and a match.";
    }
    if (gameType === "matching") {
      if (configState.matchingPairs.length < MIN_PAIRS) return `Matching games need at least ${MIN_PAIRS} pairs.`;
      if (configState.matchingPairs.some((p) => !p.left.trim() || !p.right.trim())) return "Every matching pair needs a left and right item.";
    }
    if (gameType === "puzzle") {
      if (configState.words.length < MIN_WORDS) return `Puzzles need at least ${MIN_WORDS} words.`;
      if (configState.words.some((w) => !w.trim())) return "Every puzzle word must be non-empty.";
    }
    return "";
  }

  function handleSubmit(e) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError("");
    onSave({
      title: title.trim(),
      gameType,
      courseId,
      lessonId: lessonId || null,
      isPublished,
      config: buildConfigPayload(gameType, configState),
    });
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Game" : "Create New Game"} maxWidth="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField label="Title *" name="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cell Biology Memory Match" />
          <SelectField label="Game Type *" name="gameType" value={gameType} onChange={handleGameTypeChange} options={GAME_TYPE_OPTIONS} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Course *"
            name="courseId"
            value={courseId}
            onChange={(e) => {
              setCourseId(e.target.value);
              setLessonId("");
            }}
            options={[{ value: "", label: "Select course" }, ...courses.map((c) => ({ value: c.id, label: c.title || c.name }))]}
          />
          <SelectField
            label="Lesson (optional)"
            name="lessonId"
            value={lessonId}
            onChange={(e) => setLessonId(e.target.value)}
            options={[{ value: "", label: "Whole course" }, ...lessons.map((l) => ({ value: l.id, label: `${l.moduleTitle} -- ${l.title}` }))]}
            disabled={!courseId}
          />
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
          Published (visible to students immediately)
        </label>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
          {(gameType === "quiz_match" || gameType === "trivia") && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700">Questions ({configState.questions.length})</h4>
                <button type="button" onClick={addQuestion} className="flex items-center gap-1 rounded-lg border border-dashed border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">
                  <Plus size={13} /> Add Question
                </button>
              </div>
              <div className="max-h-96 space-y-4 overflow-y-auto pr-1">
                {configState.questions.map((q, qIdx) => (
                  <div key={qIdx} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <input
                        value={q.question}
                        onChange={(e) => updateQuestion(qIdx, "question", e.target.value)}
                        placeholder={`Question ${qIdx + 1}`}
                        className={inputCls + " flex-1"}
                      />
                      {configState.questions.length > 1 && (
                        <button type="button" onClick={() => removeQuestion(qIdx)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                    <div className="space-y-2 pl-2">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${qIdx}`}
                            checked={q.correctIndex === optIdx}
                            onChange={() => updateQuestion(qIdx, "correctIndex", optIdx)}
                            title="Mark as correct answer"
                          />
                          <input
                            value={opt}
                            onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                            placeholder={`Option ${optIdx + 1}`}
                            className={inputCls + " flex-1"}
                          />
                          {q.options.length > 2 && (
                            <button type="button" onClick={() => removeOption(qIdx, optIdx)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={() => addOption(qIdx)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                        + Add option
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {gameType === "flashcard" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700">Cards ({configState.cards.length})</h4>
                <button type="button" onClick={addCard} className="flex items-center gap-1 rounded-lg border border-dashed border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">
                  <Plus size={13} /> Add Card
                </button>
              </div>
              <div className="max-h-96 space-y-2.5 overflow-y-auto pr-1">
                {configState.cards.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
                    <input value={c.front} onChange={(e) => updateCard(idx, "front", e.target.value)} placeholder="Front" className={inputCls + " flex-1"} />
                    <input value={c.back} onChange={(e) => updateCard(idx, "back", e.target.value)} placeholder="Back" className={inputCls + " flex-1"} />
                    {configState.cards.length > 1 && (
                      <button type="button" onClick={() => removeCard(idx)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {gameType === "memory" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700">Term / Match Pairs ({configState.memoryPairs.length}, min {MIN_PAIRS})</h4>
                <button type="button" onClick={() => addPair("memoryPairs", emptyTermMatchPair)} className="flex items-center gap-1 rounded-lg border border-dashed border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">
                  <Plus size={13} /> Add Pair
                </button>
              </div>
              <div className="max-h-96 space-y-2.5 overflow-y-auto pr-1">
                {configState.memoryPairs.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
                    <input value={p.term} onChange={(e) => updatePair("memoryPairs", idx, "term", e.target.value)} placeholder="Term" className={inputCls + " flex-1"} />
                    <input value={p.match} onChange={(e) => updatePair("memoryPairs", idx, "match", e.target.value)} placeholder="Match" className={inputCls + " flex-1"} />
                    {configState.memoryPairs.length > MIN_PAIRS && (
                      <button type="button" onClick={() => removePair("memoryPairs", idx)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {gameType === "matching" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700">Left / Right Pairs ({configState.matchingPairs.length}, min {MIN_PAIRS})</h4>
                <button type="button" onClick={() => addPair("matchingPairs", emptyLeftRightPair)} className="flex items-center gap-1 rounded-lg border border-dashed border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">
                  <Plus size={13} /> Add Pair
                </button>
              </div>
              <div className="max-h-96 space-y-2.5 overflow-y-auto pr-1">
                {configState.matchingPairs.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
                    <input value={p.left} onChange={(e) => updatePair("matchingPairs", idx, "left", e.target.value)} placeholder="Left item" className={inputCls + " flex-1"} />
                    <input value={p.right} onChange={(e) => updatePair("matchingPairs", idx, "right", e.target.value)} placeholder="Right match" className={inputCls + " flex-1"} />
                    {configState.matchingPairs.length > MIN_PAIRS && (
                      <button type="button" onClick={() => removePair("matchingPairs", idx)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {gameType === "puzzle" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700">Words ({configState.words.length}, min {MIN_WORDS})</h4>
                <div className="flex items-center gap-3">
                  <SelectField
                    name="puzzleType"
                    value={configState.puzzleType}
                    onChange={(e) => setConfigState((prev) => ({ ...prev, puzzleType: e.target.value }))}
                    options={[
                      { value: "word_scramble", label: "Word Scramble" },
                      { value: "word_search", label: "Word Search" },
                    ]}
                  />
                  <button type="button" onClick={addWord} className="flex items-center gap-1 whitespace-nowrap rounded-lg border border-dashed border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">
                    <Plus size={13} /> Add Word
                  </button>
                </div>
              </div>
              <div className="grid max-h-96 grid-cols-2 gap-2.5 overflow-y-auto pr-1">
                {configState.words.map((w, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5">
                    <input value={w} onChange={(e) => updateWord(idx, e.target.value)} placeholder={`Word ${idx + 1}`} className={inputCls + " flex-1"} />
                    {configState.words.length > MIN_WORDS && (
                      <button type="button" onClick={() => removeWord(idx)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {(formError || error) && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{formError || error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-5 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <div className="w-44">
            <PrimaryButton type="submit" loading={saving}>
              {initialData ? "Save Changes" : "Create Game"}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </Modal>
  );
}
