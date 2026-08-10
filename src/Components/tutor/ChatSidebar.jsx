import { Plus, MessageSquare, X } from "lucide-react";
import { useTutorChat } from "../../context/TutorChatContext";

export default function ChatSidebar({ isOpen, onClose }) {
  const { sessions, activeSessionId, selectSession, createNewChat, isDark } = useTutorChat();

  function handleSelect(id) {
    selectSession(id);
    onClose?.();
  }

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={onClose} />}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          flex w-72 shrink-0 flex-col
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
          ${isDark ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-200"}
          border-r
        `}
      >
        <div className="flex items-center justify-between p-3">
          <button
            onClick={() => {
              createNewChat();
              onClose?.();
            }}
            className={`
              flex flex-1 items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium
              ${
                isDark
                  ? "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              }
            `}
          >
            <Plus size={16} />
            New Chat
          </button>
          <button onClick={onClose} className={`ml-2 rounded-md p-1.5 lg:hidden ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-3">
          <p className={`px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            Chat History
          </p>
          <div className="space-y-0.5">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => handleSelect(session.id)}
                className={`
                  flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm
                  ${
                    session.id === activeSessionId
                      ? isDark
                        ? "bg-slate-800 text-slate-100"
                        : "bg-indigo-50 text-indigo-700"
                      : isDark
                      ? "text-slate-400 hover:bg-slate-800/60"
                      : "text-slate-600 hover:bg-slate-100"
                  }
                `}
              >
                <MessageSquare size={15} className="shrink-0" />
                <span className="truncate">{session.title}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}