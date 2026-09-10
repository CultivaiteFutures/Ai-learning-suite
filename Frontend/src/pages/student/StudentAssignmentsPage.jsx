import { useState, useEffect, useMemo } from "react";
import { ClipboardList, Clock, CheckCircle2, AlertCircle, Send, Award, BookOpen, Gamepad2, Sparkles, Trophy, RotateCcw, Flame, Check, HelpCircle, Maximize2, Minimize2, Paperclip, X, FileText } from "lucide-react";
import Modal from "../../components/ui/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import DashboardCard from "../../components/dashboard/DashboardCard";
import DataTable from "../../components/table/DataTable";
import AssignmentQuizPlayer from "../../components/student/AssignmentQuizPlayer";
import { studentAPI } from "../../services/api";

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [submissionText, setSubmissionText] = useState("");
  // Photo/PDF of handwritten work -- a lot of real math/science homework can't
  // be captured as typed text. `attachedFile` is the not-yet-uploaded File the
  // student just picked; it's uploaded on submit and its URL is sent alongside
  // the text content. `existingFileUrl` is whatever was already attached to a
  // prior submission of this same assignment (so re-opening it still shows it).
  const [attachedFile, setAttachedFile] = useState(null);
  const [existingFileUrl, setExistingFileUrl] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  // Gamified Match States
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [selectedRight, setSelectedRight] = useState(null);
  const [matchedPairs, setMatchedPairs] = useState({});
  const [shuffledRightItems, setShuffledRightItems] = useState([]);
  const [gameScore, setGameScore] = useState(0);
  const [gameCombo, setGameCombo] = useState(0);
  const [gameFinished, setGameFinished] = useState(false);

  function loadAssignments() {
    setLoading(true);
    studentAPI.getAssignments().then((res) => {
      if (res.data && Array.isArray(res.data)) {
        setAssignments(res.data);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }

  useEffect(() => {
    loadAssignments();
  }, []);

  function handleOpenSubmit(assignment) {
    setActiveAssignment(assignment);
    setSubmissionText(assignment.submission?.content || "");
    setAttachedFile(null);
    setExistingFileUrl(assignment.submission?.fileUrl || null);
    setErrorMsg("");
    setSelectedLeft(null);
    setSelectedRight(null);
    setMatchedPairs({});
    setGameScore(0);
    setGameCombo(0);
    setGameFinished(false);

    // Initialize Gamified Match pairs if applicable
    const pairs = assignment.config?.pairs || [];
    if (pairs.length > 0) {
      // Shuffle right side items
      const rightItems = pairs.map((p, idx) => ({ id: p.id || `p-${idx}`, text: p.right, origId: p.id || `p-${idx}` }));
      for (let i = rightItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rightItems[i], rightItems[j]] = [rightItems[j], rightItems[i]];
      }
      setShuffledRightItems(rightItems);
    }
  }

  function handleSelectLeftCard(item) {
    if (matchedPairs[item.id]) return;
    setSelectedLeft(item);

    if (selectedRight) {
      checkMatch(item, selectedRight);
    }
  }

  function handleSelectRightCard(item) {
    if (Object.values(matchedPairs).includes(item.origId)) return;
    setSelectedRight(item);

    if (selectedLeft) {
      checkMatch(selectedLeft, item);
    }
  }

  function checkMatch(leftItem, rightItem) {
    if (leftItem.id === rightItem.origId) {
      // Correct Match!
      const newMatched = { ...matchedPairs, [leftItem.id]: rightItem.origId };
      setMatchedPairs(newMatched);
      setGameCombo((prev) => prev + 1);
      const points = 100 + (gameCombo * 20);
      setGameScore((prev) => prev + points);
      setSelectedLeft(null);
      setSelectedRight(null);

      const totalPairs = (activeAssignment.config?.pairs || []).length;
      if (Object.keys(newMatched).length === totalPairs) {
        setGameFinished(true);
      }
    } else {
      // Incorrect Match
      setGameCombo(0);
      setTimeout(() => {
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 500);
    }
  }

  function handleResetGame() {
    setSelectedLeft(null);
    setSelectedRight(null);
    setMatchedPairs({});
    setGameScore(0);
    setGameCombo(0);
    setGameFinished(false);
    const pairs = activeAssignment?.config?.pairs || [];
    if (pairs.length > 0) {
      const rightItems = pairs.map((p, idx) => ({ id: p.id || `p-${idx}`, text: p.right, origId: p.id || `p-${idx}` }));
      for (let i = rightItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rightItems[i], rightItems[j]] = [rightItems[j], rightItems[i]];
      }
      setShuffledRightItems(rightItems);
    }
  }

  async function handleGamifiedSubmit() {
    setSubmitting(true);
    setErrorMsg("");
    try {
      const content = `Gamified Interactive Activity Completed!\nFinal Score: ${gameScore} pts\nPairs Matched: ${(activeAssignment.config?.pairs || []).length}/${(activeAssignment.config?.pairs || []).length}`;
      await studentAPI.submitAssignment(activeAssignment.id, { content });
      setSuccessMsg("🎉 Gamified Activity Completed & Submitted! (+100 XP awarded)");
      setActiveAssignment(null);
      loadAssignments();
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuizFinish(answersArray) {
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await studentAPI.submitAssignment(activeAssignment.id, { answers: answersArray });
      const score = res.data?.gradePoints;
      setSuccessMsg(`Quiz submitted! You scored ${score}/${activeAssignment.maxPoints}.`);
      setActiveAssignment(null);
      loadAssignments();
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string" && /already completed|attempt/i.test(detail)) {
        setErrorMsg(detail);
      } else {
        setErrorMsg("Submission failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!submissionText.trim() && !attachedFile && !existingFileUrl) {
      setErrorMsg("Please enter your assignment answers or attach a photo of your work before submitting.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    try {
      let fileUrl = existingFileUrl || undefined;
      if (attachedFile) {
        setUploadingFile(true);
        const uploadRes = await studentAPI.uploadSubmissionFile(activeAssignment.id, attachedFile);
        fileUrl = uploadRes.data.fileUrl;
        setUploadingFile(false);
      }
      await studentAPI.submitAssignment(activeAssignment.id, { content: submissionText, fileUrl });
      setSuccessMsg("Assignment submitted successfully! (+50 XP awarded)");
      setActiveAssignment(null);
      loadAssignments();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setUploadingFile(false);
      setErrorMsg(err.response?.data?.detail || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const stats = {
    total: assignments.length,
    submitted: assignments.filter((a) => a.status === "Submitted" || a.status === "Graded").length,
    graded: assignments.filter((a) => a.status === "Graded").length,
    pending: assignments.filter((a) => a.status === "Not Started" || a.status === "Overdue").length,
  };

  const columns = [
    {
      key: "title",
      label: "Assignment",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          {row.type === "Gamified Match" ? (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <Gamepad2 size={16} />
            </span>
          ) : (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <BookOpen size={16} />
            </span>
          )}
          <div>
            <p className="font-semibold text-slate-900">{row.title}</p>
            <p className="text-xs text-slate-500">{row.courseName} · {row.type || "Quiz"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "dueDate",
      label: "Due Date",
      sortable: true,
      render: (row) => (row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "No Deadline"),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const s = (row.status || "").toLowerCase();
        let variant = "neutral";
        if (s === "graded") variant = "success";
        else if (s === "submitted") variant = "info";
        else if (s === "overdue") variant = "danger";
        else if (s === "not started") variant = "warning";
        return <StatusBadge status={row.status} variant={variant} />;
      },
    },
    {
      key: "score",
      label: "Marks / Grade",
      render: (row) => (
        row.submission?.gradePoints !== undefined && row.submission?.gradePoints !== null ? (
          <span className="font-bold text-indigo-600">
            {row.submission.gradePoints} / {row.maxPoints}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )
      ),
    },
    {
      key: "action",
      label: "",
      render: (row) => (
        <div className="flex justify-end">
          <button
            onClick={() => handleOpenSubmit(row)}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold shadow-sm transition flex items-center gap-1.5 ${
              row.submission
                ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                : row.type === "Gamified Match"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-95"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            {row.type === "Gamified Match" && !row.submission && <Gamepad2 size={13} />}
            {row.submission ? "View Work" : (row.type === "Gamified Match" ? "Play & Complete" : "Start Assignment")}
          </button>
        </div>
      ),
    },
  ];

  const wordCount = submissionText.trim() ? submissionText.trim().split(/\s+/).length : 0;
  const isGamifiedActive = activeAssignment && (activeAssignment.type === "Gamified Match" || (activeAssignment.config?.pairs && activeAssignment.config.pairs.length > 0));
  const isQuizActive = activeAssignment && activeAssignment.type === "Quiz" && Array.isArray(activeAssignment.config?.questions) && activeAssignment.config.questions.length > 0 && !activeAssignment.submission;

  // Read-only per-question review for an already-submitted real quiz. Only
  // meaningful when the assignment actually carries real quiz questions AND
  // the submission content parses as the auto-grader's own JSON shape --
  // a plain free-text submission (including one made under the unchanged
  // legacy path for a "Quiz"-labeled assignment with no real config) simply
  // fails JSON.parse and falls back to the existing plain-text rendering
  // further below, untouched.
  let quizReviewAnswers = null;
  if (
    activeAssignment &&
    activeAssignment.type === "Quiz" &&
    Array.isArray(activeAssignment.config?.questions) &&
    activeAssignment.config.questions.length > 0 &&
    activeAssignment.submission
  ) {
    try {
      const parsed = JSON.parse(activeAssignment.submission.content);
      if (parsed && Array.isArray(parsed.answers)) {
        quizReviewAnswers = parsed.answers;
      }
    } catch {
      quizReviewAnswers = null;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Assignments & Assessments</h1>
        <p className="mt-1 text-sm text-slate-500">Solve problem sets, submit written solutions, or complete interactive gamified activities.</p>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 border border-emerald-200 shadow-sm">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <DashboardCard label="Total Assignments" value={stats.total} icon={ClipboardList} accent="indigo" />
        <DashboardCard label="Submitted" value={stats.submitted} icon={CheckCircle2} accent="emerald" />
        <DashboardCard label="Graded" value={stats.graded} icon={Award} accent="purple" />
        <DashboardCard label="Pending Action" value={stats.pending} icon={Clock} accent="amber" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
        <DataTable
          columns={columns}
          data={assignments}
          loading={loading}
          keyExtractor={(row) => row.id}
          emptyTitle="No assignments found"
          emptyDescription="Assignments and practice challenges created for your enrolled courses will appear here."
        />
      </div>

      {/* Spacious Workspace Modal */}
      {activeAssignment && (
        <Modal
          isOpen={!!activeAssignment}
          onClose={() => setActiveAssignment(null)}
          title={`Assignment: ${activeAssignment.title}`}
          maxWidth="max-w-5xl"
        >
          <div className="space-y-6">
            {/* Header info badge */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">
                  Course: {activeAssignment.courseName}
                </span>
                <span className="font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-lg">
                  Format: {activeAssignment.type || "Standard"}
                </span>
              </div>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3.5 py-1.5 rounded-lg border border-indigo-100">
                Maximum Score: {activeAssignment.maxPoints} pts
              </span>
            </div>

            {/* If Graded, show feedback */}
            {activeAssignment.submission?.gradePoints !== undefined && activeAssignment.submission?.gradePoints !== null && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 flex items-center gap-1.5 text-sm">
                    <Trophy size={18} className="text-emerald-600" /> Score Awarded:
                  </span>
                  <span className="font-bold text-emerald-700 text-base">{activeAssignment.submission.gradePoints} / {activeAssignment.maxPoints} pts</span>
                </div>
                {activeAssignment.submission.feedback && (
                  <div className="pt-2 border-t border-emerald-200/60">
                    <p className="font-semibold text-emerald-950">Instructor Evaluation & Feedback:</p>
                    <p className="text-emerald-850 mt-1 leading-relaxed text-sm">{activeAssignment.submission.feedback}</p>
                  </div>
                )}
              </div>
            )}

            {/* SELF-GRADING QUIZ PLAYER */}
            {isQuizActive ? (
              <AssignmentQuizPlayer questions={activeAssignment.config.questions} onFinish={handleQuizFinish} />
            ) : isGamifiedActive ? (
              <div className="space-y-5">
                {/* Game Score & Combo Status Bar */}
                <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-purple-700 to-indigo-700 p-5 text-white shadow-sm">
                  <div className="flex items-center gap-3">
                    <Gamepad2 size={26} className="text-purple-200" />
                    <div>
                      <h3 className="text-base font-bold">Interactive Matching Challenge</h3>
                      <p className="text-xs text-purple-200">Tap a Concept on the Left, then tap its Matching Definition on the Right!</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    {gameCombo > 1 && (
                      <div className="flex items-center gap-1 rounded-full bg-amber-400/30 px-3 py-1 text-xs font-bold text-amber-200">
                        <Flame size={14} className="text-amber-300" /> {gameCombo}x Combo!
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-purple-200">Score</p>
                      <p className="text-lg font-extrabold text-amber-300">{gameScore} pts</p>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <p className="text-sm leading-relaxed text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {activeAssignment.description || "Match each key concept or picture term on the left with its correct definition or counterpart on the right."}
                </p>

                {/* Game Finished Victory Card */}
                {gameFinished ? (
                  <div className="rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-8 text-center space-y-4 shadow-sm">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Sparkles size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">All Pairs Successfully Matched!</h3>
                      <p className="mt-1 text-sm text-slate-600">Outstanding job! You scored <strong className="text-emerald-700">{gameScore} points</strong>.</p>
                    </div>
                    <div className="flex justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleResetGame}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <RotateCcw size={14} /> Play Again
                      </button>
                      <button
                        type="button"
                        onClick={handleGamifiedSubmit}
                        disabled={submitting}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm disabled:opacity-50"
                      >
                        <Check size={16} /> {submitting ? "Submitting..." : "Submit Results & Claim +100 XP"}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Cards Grid */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left Column: Terms */}
                    <div className="space-y-2.5">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Concepts / Terms</p>
                      {(activeAssignment.config?.pairs || []).map((pair, idx) => {
                        const isMatched = !!matchedPairs[pair.id || `p-${idx}`];
                        const isSelected = selectedLeft?.id === (pair.id || `p-${idx}`);

                        return (
                          <button
                            key={pair.id || idx}
                            type="button"
                            onClick={() => handleSelectLeftCard({ id: pair.id || `p-${idx}`, left: pair.left })}
                            disabled={isMatched}
                            className={`flex w-full items-center gap-3.5 rounded-xl border p-4 text-left text-sm transition shadow-xs ${
                              isMatched
                                ? "border-emerald-300 bg-emerald-50/80 text-emerald-800 opacity-60 cursor-default"
                                : isSelected
                                ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-500 font-semibold text-indigo-900"
                                : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50 text-slate-800"
                            }`}
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg">
                              {pair.emoji || "🎯"}
                            </span>
                            <span className="flex-1 font-medium">{pair.left}</span>
                            {isMatched && <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Right Column: Definitions */}
                    <div className="space-y-2.5">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Matching Definitions / Answers</p>
                      {shuffledRightItems.map((item) => {
                        const isMatched = Object.values(matchedPairs).includes(item.origId);
                        const isSelected = selectedRight?.id === item.id;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectRightCard(item)}
                            disabled={isMatched}
                            className={`flex w-full items-center gap-3.5 rounded-xl border p-4 text-left text-sm transition shadow-xs ${
                              isMatched
                                ? "border-emerald-300 bg-emerald-50/80 text-emerald-800 opacity-60 cursor-default"
                                : isSelected
                                ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-500 font-semibold text-indigo-900"
                                : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50 text-slate-800"
                            }`}
                          >
                            <span className="flex-1 leading-relaxed text-xs">{item.text}</span>
                            {isMatched && <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* STANDARD / HIGHER GRADE WRITTEN ASSIGNMENT WORKSPACE */
              <div className="space-y-6">
                {/* Problem Questions / Instructions - Spacious Box */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 space-y-3 shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 flex items-center gap-2">
                    <BookOpen size={16} className="text-indigo-600" /> Problem Questions & Assignment Instructions
                  </h3>
                  <div className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap max-h-72 overflow-y-auto pr-2">
                    {activeAssignment.description || "No specific instructions provided."}
                  </div>
                </div>

                {/* SELF-GRADING QUIZ: read-only per-question review once submitted */}
                {quizReviewAnswers ? (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700 flex items-center gap-2">
                      <HelpCircle size={16} className="text-indigo-600" /> Your Quiz Answers
                    </h3>
                    {activeAssignment.config.questions.map((q, qIdx) => {
                      const pickedIdx = quizReviewAnswers[qIdx];
                      const correctIdx = q.correct_index ?? q.correctIndex ?? -1;
                      const wasCorrect = pickedIdx !== null && pickedIdx !== undefined && pickedIdx === correctIdx;
                      return (
                        <div key={qIdx} className="rounded-xl border border-slate-200 bg-white p-4 space-y-1.5">
                          <p className="text-sm font-semibold text-slate-900">
                            {qIdx + 1}. {q.question}
                          </p>
                          <p className={`text-xs font-medium ${wasCorrect ? "text-emerald-600" : "text-rose-600"}`}>
                            Your answer: {pickedIdx !== null && pickedIdx !== undefined ? q.options?.[pickedIdx] : "(no answer)"} {wasCorrect ? "— Correct" : "— Incorrect"}
                          </p>
                          {!wasCorrect && correctIdx >= 0 && (
                            <p className="text-xs text-slate-500">Correct answer: {q.options?.[correctIdx]}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                /* Answer Form / Submission View - Extra Large Workspace */
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-700">
                        Your Detailed Solution & Answers *
                      </label>
                      <span className="text-xs text-slate-400 font-mono">
                        {wordCount} words · {submissionText.length} characters
                      </span>
                    </div>
                    <textarea
                      rows={14}
                      value={submissionText}
                      onChange={(e) => setSubmissionText(e.target.value)}
                      disabled={activeAssignment.submission?.gradePoints !== null && activeAssignment.submission?.gradePoints !== undefined}
                      placeholder="Type your complete solution, equations, proofs, calculations, or analysis here..."
                      className="w-full min-h-[320px] rounded-2xl border border-slate-300 p-5 text-sm font-normal leading-relaxed text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50"
                    />
                  </div>

                  {(() => {
                    const isGraded = activeAssignment.submission?.gradePoints !== null && activeAssignment.submission?.gradePoints !== undefined;
                    return (
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-700">
                          Attach a Photo or PDF of Your Work (optional)
                        </label>
                        <p className="text-xs text-slate-400">
                          For work shown on paper -- a photo of your handwritten steps, or a scanned PDF. JPG, PNG, WEBP, HEIC, or PDF, up to 10 MB.
                        </p>
                        {!isGraded && (
                          <label className="flex w-fit items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
                            <Paperclip size={14} />
                            {attachedFile ? "Change file" : "Choose a file"}
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.webp,.heic,.pdf,image/*,application/pdf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) setAttachedFile(file);
                              }}
                            />
                          </label>
                        )}
                        {attachedFile && (
                          <div className="flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                            <FileText size={14} />
                            <span className="truncate">{attachedFile.name}</span>
                            <button type="button" onClick={() => setAttachedFile(null)} className="ml-auto text-indigo-400 hover:text-indigo-700">
                              <X size={14} />
                            </button>
                          </div>
                        )}
                        {!attachedFile && existingFileUrl && (
                          <a
                            href={existingFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex w-fit items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-indigo-600 hover:underline"
                          >
                            <FileText size={14} />
                            View previously attached file
                          </a>
                        )}
                      </div>
                    );
                  })()}

                  {errorMsg && (
                    <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-xs text-rose-700 border border-rose-200">
                      <AlertCircle size={16} className="shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveAssignment(null)}
                      className="rounded-lg border border-slate-300 px-5 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Close
                    </button>
                    {!(activeAssignment.submission?.gradePoints !== null && activeAssignment.submission?.gradePoints !== undefined) && (
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
                      >
                        <Send size={14} />
                        {uploadingFile ? "Uploading file..." : submitting ? "Submitting..." : (activeAssignment.submission ? "Update Submission" : "Submit Assignment")}
                      </button>
                    )}
                  </div>
                </form>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
