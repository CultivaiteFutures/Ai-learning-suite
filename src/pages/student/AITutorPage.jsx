import { useState, useRef, useEffect } from "react";
import { Menu, Bot } from "lucide-react";
import ChatSidebar from "../../components/tutor/ChatSidebar";
import ChatMessage from "../../components/tutor/ChatMessage";
import SuggestedQuestions from "../../components/tutor/SuggestedQuestions";
import QuickPrompts from "../../components/tutor/QuickPrompts";
import ChatInput from "../../components/tutor/ChatInput";
import ThemeToggle from "../../components/tutor/ThemeToggle";
import { useTutorChat } from "../../context/TutorChatContext";

export default function AITutorPage() {
  const { activeSession, sendMessage, isSending, isDark, toggleTheme } = useTutorChat();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeSession?.messages]);

  const hasMessages = activeSession && activeSession.messages.length > 0;

  function handleSend(text, attachment) {
    sendMessage(text, attachment);
  }

  return (
    <div
      className={`
        -m-4 lg:-m-8 flex h-[calc(100vh-4rem)] overflow-hidden rounded-none
        ${isDark ? "bg-slate-900" : "bg-white"}
      `}
    >
      <ChatSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div
          className={`flex items-center justify-between border-b px-4 py-3 sm:px-6 ${
            isDark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className={`rounded-md p-1.5 lg:hidden ${isDark ? "text-slate-400 hover:bg-slate-800" : "text-slate-500 hover:bg-slate-100"}`}
            >
              <Menu size={20} />
            </button>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDark ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600"}`}>
              <Bot size={16} />
            </div>
            <div>
              <p className={`text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>AI Tutor</p>
              <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>Always here to help you learn</p>
            </div>
          </div>

          <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          {!hasMessages ? (
            <SuggestedQuestions onSelect={handleSend} isDark={isDark} />
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-5">
              {activeSession.messages.map((message) => (
                <ChatMessage key={message.id} message={message} isDark={isDark} />
              ))}
            </div>
          )}
        </div>

        {/* Quick prompts (only once conversation has started, above input) */}
        {hasMessages && (
          <div className={`border-t px-4 pt-3 sm:px-6 ${isDark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}>
            <div className="mx-auto max-w-3xl">
              <QuickPrompts onSelect={handleSend} isDark={isDark} disabled={isSending} />
            </div>
          </div>
        )}

        <div className="mx-auto w-full max-w-3xl">
          <ChatInput onSend={handleSend} isDark={isDark} disabled={isSending} />
        </div>
      </div>
    </div>
  );
}