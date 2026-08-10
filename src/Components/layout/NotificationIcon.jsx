import { useState, useRef, useEffect } from "react";
import { Bell, CheckCheck } from "lucide-react";

const SAMPLE_NOTIFICATIONS = [
  {
    id: 1,
    title: "New quiz submission",
    detail: "Aarav Mehta submitted 'Algebra Basics Quiz'",
    time: "12m ago",
    unread: true,
  },
  {
    id: 2,
    title: "Course published",
    detail: "'Intro to Photosynthesis' is now live for Grade 6",
    time: "1h ago",
    unread: true,
  },
  {
    id: 3,
    title: "Weekly report ready",
    detail: "Your class performance report for this week is ready",
    time: "Yesterday",
    unread: false,
  },
];

export default function NotificationIcon() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(SAMPLE_NOTIFICATIONS);
  const ref = useRef(null);

  const unreadCount = notifications.filter((n) => n.unread).length;

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg z-50">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              <CheckCheck size={13} />
              Mark all read
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">
                You're all caught up.
              </p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="flex gap-3 border-b border-slate-50 px-4 py-3 last:border-b-0 hover:bg-slate-50"
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      n.unread ? "bg-indigo-500" : "bg-transparent"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">{n.title}</p>
                    <p className="truncate text-xs text-slate-500">{n.detail}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{n.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}