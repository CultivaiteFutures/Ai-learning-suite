import { useState, useEffect, useCallback } from "react";
import { StickyNote, Highlighter, Bookmark, BookmarkCheck, Plus, X, Loader2, Check } from "lucide-react";
import { studentAPI } from "../../services/api";

/**
 * Task #50: a personal notepad + saved highlights + bookmark toggle for the
 * lesson currently open in CoursePlayerPage. Purely client-debounced saves
 * against /student/lessons/{lessonId}/notes -- never visible to anyone but
 * the student themselves.
 */
export default function LessonNotesPanel({ lessonId }) {
  const [loading, setLoading] = useState(true);
  const [notesText, setNotesText] = useState("");
  const [highlights, setHighlights] = useState([]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [newHighlight, setNewHighlight] = useState("");
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    studentAPI
      .getLessonNotes(lessonId)
      .then((res) => {
        if (cancelled) return;
        setNotesText(res.data.notesText || "");
        setHighlights(res.data.highlights || []);
        setIsBookmarked(!!res.data.isBookmarked);
      })
      .catch(() => {
        if (!cancelled) {
          setNotesText("");
          setHighlights([]);
          setIsBookmarked(false);
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  const persist = useCallback(
    (next) => {
      setSaveState("saving");
      studentAPI
        .setLessonNotes(lessonId, {
          notesText: next.notesText,
          highlights: next.highlights,
          isBookmarked: next.isBookmarked,
        })
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("idle"));
    },
    [lessonId]
  );

  // Debounce free-typed notes so we're not firing a request per keystroke.
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => persist({ notesText, highlights, isBookmarked }), 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notesText]);

  function toggleBookmark() {
    const next = !isBookmarked;
    setIsBookmarked(next);
    persist({ notesText, highlights, isBookmarked: next });
  }

  function addHighlight() {
    if (!newHighlight.trim()) return;
    const next = [...highlights, { text: newHighlight.trim() }];
    setHighlights(next);
    setNewHighlight("");
    persist({ notesText, highlights: next, isBookmarked });
  }

  function removeHighlight(index) {
    const next = highlights.filter((_, i) => i !== index);
    setHighlights(next);
    persist({ notesText, highlights: next, isBookmarked });
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <Loader2 size={16} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
          <StickyNote size={14} className="text-indigo-600" /> My Notes
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-medium text-slate-400">
            {saveState === "saving" && (
              <span className="flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Saving...</span>
            )}
            {saveState === "saved" && (
              <span className="flex items-center gap-1 text-emerald-600"><Check size={11} /> Saved</span>
            )}
          </span>
          <button
            type="button"
            onClick={toggleBookmark}
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
              isBookmarked ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
          >
            {isBookmarked ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
            {isBookmarked ? "Bookmarked" : "Bookmark"}
          </button>
        </div>
      </div>

      <textarea
        value={notesText}
        onChange={(e) => setNotesText(e.target.value)}
        rows={4}
        placeholder="Jot down anything you want to remember about this lesson..."
        className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm leading-relaxed focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      />

      <div className="space-y-2">
        <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          <Highlighter size={13} className="text-amber-500" /> Saved Highlights
        </h4>
        {highlights.length === 0 ? (
          <p className="text-xs italic text-slate-400">No highlights saved yet. Paste a key passage below to save it.</p>
        ) : (
          <ul className="space-y-1.5">
            {highlights.map((h, i) => (
              <li key={i} className="flex items-start justify-between gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-900">
                <span className="whitespace-pre-wrap">{h.text}</span>
                <button type="button" onClick={() => removeHighlight(i)} className="shrink-0 text-amber-400 hover:text-rose-600">
                  <X size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <input
            value={newHighlight}
            onChange={(e) => setNewHighlight(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addHighlight()}
            placeholder="Paste or type a passage to highlight..."
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={addHighlight}
            className="flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600"
          >
            <Plus size={13} /> Save
          </button>
        </div>
      </div>
    </div>
  );
}
