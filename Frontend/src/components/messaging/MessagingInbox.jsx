import { useState, useEffect, useCallback, useRef } from "react";
import { Send, Mail, Plus, ArrowLeft, X } from "lucide-react";
import LoadingState from "../common/LoadingState";
import EmptyState from "../common/EmptyState";
import { messagingAPI } from "../../services/api";

/**
 * Shared inbox UI for direct 1:1 messaging, used identically by the
 * Teacher, Student, and Parent "Messages" pages -- only the copy differs.
 * Backend (app/api/v1/messaging.py) already scopes contacts/conversations
 * to people the caller has an actual course relationship with, so this
 * component never has to reason about who's allowed to talk to whom.
 *
 * No websockets in this app -- new messages/unread counts are picked up
 * by lightweight polling while the inbox is open, same "no real-time
 * infra" tradeoff already made for notifications elsewhere.
 */
export default function MessagingInbox({ subtitle = "Send and receive direct messages." }) {
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const threadEndRef = useRef(null);

  const loadConversations = useCallback(() => {
    return messagingAPI
      .listConversations()
      .then((res) => setConversations(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError("Could not load your conversations. Please try again."));
  }, []);

  const loadContacts = useCallback(() => {
    return messagingAPI
      .listContacts()
      .then((res) => setContacts(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([loadConversations(), loadContacts()]).finally(() => setLoadingList(false));
    const interval = setInterval(loadConversations, 15000);
    return () => clearInterval(interval);
  }, [loadConversations, loadContacts]);

  const loadThread = useCallback((conversationId) => {
    setLoadingThread(true);
    messagingAPI
      .listMessages(conversationId)
      .then((res) => setMessages(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError("Could not load this conversation."))
      .finally(() => {
        setLoadingThread(false);
        loadConversations();
      });
  }, [loadConversations]);

  useEffect(() => {
    if (!activeId) return;
    loadThread(activeId);
    const interval = setInterval(() => loadThread(activeId), 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openConversation = (conversationId) => {
    setShowContacts(false);
    setActiveId(conversationId);
  };

  const startConversationWith = (contact) => {
    setError("");
    messagingAPI
      .startConversation(contact.id)
      .then((res) => {
        loadConversations();
        openConversation(res.data.id);
      })
      .catch(() => setError("Could not start a conversation with this person."));
  };

  const handleSend = (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !activeId) return;
    setSending(true);
    messagingAPI
      .sendMessage(activeId, body)
      .then((res) => {
        setMessages((prev) => [...prev, res.data]);
        setDraft("");
        loadConversations();
      })
      .catch(() => setError("Message could not be sent. Please try again."))
      .finally(() => setSending(false));
  };

  const activeConversation = conversations.find((c) => c.id === activeId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Messages</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-slate-200 bg-white md:grid-cols-[300px_1fr]" style={{ minHeight: "32rem" }}>
        {/* Conversation list / contact picker pane */}
        <div className={`flex flex-col border-slate-200 md:border-r ${activeId && !showContacts ? "hidden md:flex" : "flex"}`}>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-semibold text-slate-800">
              {showContacts ? "New message" : "Conversations"}
            </span>
            <button
              type="button"
              onClick={() => setShowContacts((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              {showContacts ? <X size={14} /> : <Plus size={14} />}
              {showContacts ? "Cancel" : "New"}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <LoadingState rows={4} columns={1} />
            ) : showContacts ? (
              contacts.length === 0 ? (
                <EmptyState title="No one to message yet" description="You don't have any eligible contacts right now." icon={Mail} />
              ) : (
                <div className="divide-y divide-slate-100">
                  {contacts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => startConversationWith(c)}
                      className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">{c.name}</p>
                        <p className="text-xs capitalize text-slate-400">{c.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : conversations.length === 0 ? (
              <EmptyState title="No conversations yet" description="Start a new message to reach out." icon={Mail} />
            ) : (
              <div className="divide-y divide-slate-100">
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => openConversation(c.id)}
                    className={`flex w-full items-start justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50 ${activeId === c.id ? "bg-indigo-50" : ""}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{c.otherParticipant?.name}</p>
                      <p className="truncate text-xs text-slate-400">{c.lastMessage || "No messages yet"}</p>
                    </div>
                    {c.unreadCount > 0 && (
                      <span className="mt-0.5 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-xs font-semibold text-white">
                        {c.unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active thread pane */}
        <div className={`flex flex-col ${activeId && !showContacts ? "flex" : "hidden md:flex"}`}>
          {!activeId ? (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState title="Select a conversation" description="Pick someone from the list, or start a new message." icon={Mail} />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                <button type="button" onClick={() => setActiveId(null)} className="text-slate-400 hover:text-slate-600 md:hidden">
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{activeConversation?.otherParticipant?.name || "Conversation"}</p>
                  {activeConversation?.otherParticipant?.role && (
                    <p className="text-xs capitalize text-slate-400">{activeConversation.otherParticipant.role}</p>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {loadingThread && messages.length === 0 ? (
                  <LoadingState rows={3} columns={1} />
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`flex ${m.isMine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${m.isMine ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-800"}`}>
                        <p className="whitespace-pre-wrap">{m.body}</p>
                        <p className={`mt-1 text-[11px] ${m.isMine ? "text-indigo-100" : "text-slate-400"}`}>
                          {new Date(m.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={threadEndRef} />
              </div>

              <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-slate-100 px-4 py-3">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  maxLength={5000}
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send size={14} />
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
