import { Bot, User, AlertTriangle } from "lucide-react";
import TypingIndicator from "./TypingIndicator";

export default function ChatMessage({ message, isDark }) {
  const isUser = message.role === "user";
  // Optional: a plain, truthful system/error notice (e.g. "AI not configured for this
  // school") gets a distinct rose treatment instead of looking like a real AI reply.
  // message.isError is undefined for every existing caller, so this never changes
  // current behavior anywhere it isn't explicitly set.
  const isError = !isUser && !!message.isError;

  const bubbleClass = isUser
    ? "bg-indigo-600 text-white"
    : isError
    ? isDark
      ? "bg-rose-950/40 text-rose-200 border border-rose-800"
      : "bg-rose-50 text-rose-700 border border-rose-200"
    : isDark
    ? "bg-slate-800 text-slate-100 border border-slate-700"
    : "bg-white text-slate-800 border border-slate-200";

  const avatarClass = isUser
    ? "bg-indigo-600 text-white"
    : isError
    ? isDark
      ? "bg-rose-900/40 text-rose-300"
      : "bg-rose-50 text-rose-600"
    : isDark
    ? "bg-slate-700 text-indigo-300"
    : "bg-indigo-50 text-indigo-600";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${avatarClass}`}>
        {isUser ? <User size={16} /> : isError ? <AlertTriangle size={16} /> : <Bot size={16} />}
      </div>

      <div className={`flex max-w-[75%] flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}>
        {message.attachment && (
          <img
            src={message.attachment.previewUrl}
            alt={message.attachment.name}
            className="h-32 w-32 rounded-lg border border-slate-200 object-cover"
          />
        )}

        {(message.content || message.isTyping) && (
          <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${bubbleClass}`}>
            {message.content ? (
              <span className="whitespace-pre-wrap">{message.content}</span>
            ) : (
              <TypingIndicator isDark={isDark} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}