import { useState, useEffect, useCallback } from "react";
import { MessageSquare, CheckCircle2, Circle, Plus, Send } from "lucide-react";
import SelectField from "../ui/SelectField";
import Modal from "../ui/Modal";
import InputField from "../ui/InputField";
import TextAreaField from "../ui/TextAreaField";
import PrimaryButton from "../ui/PrimaryButton";
import EmptyState from "./EmptyState";
import LoadingState from "./LoadingState";
import { discussionsAPI } from "../../services/api";

/**
 * Shared course-scoped Q&A board: course picker + thread list + thread
 * detail with replies. Used by both the Teacher and Student Discussions
 * pages -- the only thing that differs by role is which courses are passed
 * in (a teacher's taught courses vs. a student's enrolled courses) and
 * whether the caller may resolve someone else's thread.
 */
export default function DiscussionBoard({ courses, currentUserId, canResolveAny }) {
  const [courseId, setCourseId] = useState(courses[0]?.id || "");
  const [threads, setThreads] = useState([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [threadsError, setThreadsError] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState({ title: "", content: "" });
  const [newErrors, setNewErrors] = useState({});
  const [creating, setCreating] = useState(false);

  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [resolving, setResolving] = useState(false);

  const loadThreads = useCallback(() => {
    if (!courseId) {
      setThreads([]);
      return;
    }
    setThreadsLoading(true);
    discussionsAPI
      .listByCourse(courseId)
      .then((res) => {
        setThreads(Array.isArray(res.data) ? res.data : []);
        setThreadsError("");
      })
      .catch(() => setThreadsError("Could not load discussions for this course."))
      .finally(() => setThreadsLoading(false));
  }, [courseId]);

  useEffect(() => {
    loadThreads();
    setSelectedId(null);
    setDetail(null);
  }, [loadThreads]);

  const loadDetail = useCallback((id) => {
    if (!id) return;
    setDetailLoading(true);
    discussionsAPI
      .getById(id)
      .then((res) => {
        setDetail(res.data);
        setDetailError("");
      })
      .catch(() => setDetailError("Could not load this discussion."))
      .finally(() => setDetailLoading(false));
  }, []);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  function handleSelectThread(id) {
    setSelectedId(id);
    setReplyText("");
  }

  function validateNew() {
    const next = {};
    if (!newForm.title.trim()) next.title = "Title is required";
    if (!newForm.content.trim()) next.content = "Describe your question";
    setNewErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!validateNew()) return;
    setCreating(true);
    try {
      const res = await discussionsAPI.create({
        title: newForm.title.trim(),
        content: newForm.content.trim(),
        courseId,
      });
      setNewOpen(false);
      setNewForm({ title: "", content: "" });
      loadThreads();
      if (res?.data?.id) {
        setSelectedId(res.data.id);
      }
    } catch (err) {
      setNewErrors({ form: err?.response?.data?.detail || "Could not post this discussion." });
    } finally {
      setCreating(false);
    }
  }

  async function handleReply(e) {
    e.preventDefault();
    if (!replyText.trim() || !selectedId) return;
    setReplying(true);
    try {
      await discussionsAPI.reply(selectedId, { content: replyText.trim() });
      setReplyText("");
      loadDetail(selectedId);
    } catch {
      setDetailError("Could not post your reply. Please try again.");
    } finally {
      setReplying(false);
    }
  }

  async function handleToggleResolved(nextValue) {
    if (!selectedId) return;
    setResolving(true);
    try {
      await discussionsAPI.setResolved(selectedId, nextValue);
      loadDetail(selectedId);
      loadThreads();
    } catch {
      setDetailError("Could not update the resolved status.");
    } finally {
      setResolving(false);
    }
  }

  const courseOptions = courses.map((c) => ({ value: c.id, label: c.title || c.name || "Untitled course" }));
  const canResolveThis = !!detail && (canResolveAny || detail.authorId === currentUserId);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      {/* Left: course picker + thread list */}
      <div className="rounded-xl border border-slate-200 bg-white lg:col-span-2">
        <div className="space-y-3 border-b border-slate-200 p-4">
          <SelectField
            label="Course"
            name="courseId"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            options={courseOptions.length ? courseOptions : [{ value: "", label: "No courses available" }]}
          />
          <button
            onClick={() => setNewOpen(true)}
            disabled={!courseId}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            <Plus size={16} />
            Ask a Question
          </button>
        </div>

        {threadsError && <div className="px-4 pt-3 text-sm text-rose-600">{threadsError}</div>}

        {threadsLoading ? (
          <LoadingState rows={4} columns={1} />
        ) : threads.length === 0 ? (
          <EmptyState
            title="No discussions yet"
            description="Ask the first question for this course."
            icon={MessageSquare}
          />
        ) : (
          <div className="max-h-[32rem] divide-y divide-slate-100 overflow-y-auto">
            {threads.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelectThread(t.id)}
                className={`block w-full px-4 py-3 text-left transition hover:bg-slate-50 ${
                  selectedId === t.id ? "bg-indigo-50" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">{t.title}</p>
                  {t.isResolved ? (
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" />
                  ) : (
                    <Circle size={15} className="mt-0.5 shrink-0 text-amber-400" />
                  )}
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-slate-500">{t.content}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {t.authorName || "Someone"} &middot; {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ""}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: thread detail + replies */}
      <div className="rounded-xl border border-slate-200 bg-white lg:col-span-3">
        {!selectedId ? (
          <EmptyState
            title="Select a discussion"
            description="Pick a thread on the left to read the question and its replies."
            icon={MessageSquare}
          />
        ) : detailLoading ? (
          <LoadingState rows={5} columns={1} />
        ) : detailError ? (
          <div className="p-6 text-sm text-rose-600">{detailError}</div>
        ) : detail ? (
          <div className="flex h-full flex-col">
            <div className="border-b border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold text-slate-900">{detail.title}</h3>
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    detail.isResolved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {detail.isResolved ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                  {detail.isResolved ? "Resolved" : "Open"}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{detail.content}</p>
              <p className="mt-2 text-xs text-slate-400">
                {detail.authorName || "Someone"} &middot;{" "}
                {detail.createdAt ? new Date(detail.createdAt).toLocaleString() : ""}
              </p>
              {canResolveThis && (
                <button
                  onClick={() => handleToggleResolved(!detail.isResolved)}
                  disabled={resolving}
                  className="mt-3 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {detail.isResolved ? "Mark as Open" : "Mark as Resolved"}
                </button>
              )}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {(detail.replies || []).length === 0 ? (
                <p className="text-sm text-slate-400">No replies yet.</p>
              ) : (
                detail.replies.map((r) => (
                  <div key={r.id} className="rounded-lg bg-slate-50 p-3">
                    <p className="text-sm text-slate-700">{r.content}</p>
                    <p className="mt-1.5 text-xs text-slate-400">
                      {r.authorName || "Someone"} &middot; {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
                    </p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleReply} className="flex items-end gap-2 border-t border-slate-200 p-4">
              <div className="flex-1">
                <TextAreaField
                  name="replyText"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  rows={2}
                />
              </div>
              <button
                type="submit"
                disabled={replying || !replyText.trim()}
                className="flex h-[42px] shrink-0 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                <Send size={15} />
                Reply
              </button>
            </form>
          </div>
        ) : null}
      </div>

      <Modal isOpen={newOpen} onClose={() => setNewOpen(false)} title="Ask a Question">
        <form onSubmit={handleCreate} className="space-y-4">
          {newErrors.form && <p className="text-sm text-rose-600">{newErrors.form}</p>}
          <InputField
            label="Title"
            name="title"
            value={newForm.title}
            onChange={(e) => setNewForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="What's your question about?"
            error={newErrors.title}
          />
          <TextAreaField
            label="Details"
            name="content"
            value={newForm.content}
            onChange={(e) => setNewForm((prev) => ({ ...prev, content: e.target.value }))}
            placeholder="Describe your doubt in detail..."
            rows={5}
            error={newErrors.content}
          />
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setNewOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <div className="w-36">
              <PrimaryButton type="submit" loading={creating}>
                Post
              </PrimaryButton>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
