import { useState, useEffect, useMemo } from "react";
import { CalendarDays, BookOpen, Globe2, PartyPopper, ClipboardCheck, Clock3 } from "lucide-react";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import { calendarAPI } from "../../services/api";
import CalendarSyncButton from "../../components/common/CalendarSyncButton";

const EVENT_TYPE_STYLES = {
  holiday: "bg-emerald-50 text-emerald-700",
  exam: "bg-rose-50 text-rose-700",
  deadline: "bg-amber-50 text-amber-700",
  event: "bg-indigo-50 text-indigo-700",
};

const EVENT_TYPE_ICONS = {
  holiday: PartyPopper,
  exam: ClipboardCheck,
  deadline: Clock3,
  event: CalendarDays,
};

function EventRow({ event }) {
  const Icon = EVENT_TYPE_ICONS[event.eventType] || CalendarDays;
  return (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">{event.title}</h3>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${EVENT_TYPE_STYLES[event.eventType] || "bg-slate-100 text-slate-600"}`}>
          <Icon size={12} /> {event.eventType || "event"}
        </span>
      </div>
      {event.description && (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{event.description}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1">
          <CalendarDays size={12} />
          {event.eventDate ? new Date(event.eventDate).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—"}
        </span>
        <span className="inline-flex items-center gap-1">
          {event.courseId ? <BookOpen size={12} /> : <Globe2 size={12} />}
          {event.courseId ? "Course event" : "School-wide"}
        </span>
      </div>
    </div>
  );
}

/**
 * Read-only, same shared GET /events endpoint the student page uses --
 * app/api/v1/calendar.py scopes PARENT to school-wide events plus anything
 * for a course any of their linked children are enrolled in.
 */
export default function AcademicCalendarPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    calendarAPI
      .listEvents()
      .then((res) => setEvents(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError("Could not load the calendar. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const sorted = [...events].sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
    return {
      upcoming: sorted.filter((e) => e.eventDate && new Date(e.eventDate) >= now),
      past: sorted.filter((e) => e.eventDate && new Date(e.eventDate) < now).reverse(),
    };
  }, [events]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Academic Calendar</h1>
          <p className="mt-1 text-sm text-slate-500">Holidays, exams, and deadlines for your school and your children's courses.</p>
        </div>
        <CalendarSyncButton />
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <LoadingState rows={4} columns={1} />
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState
            title="No events yet"
            description="Holidays, exams, and deadlines from your children's school and courses will show up here."
            icon={CalendarDays}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Upcoming ({upcoming.length})</h2>
            <div className="rounded-xl border border-slate-200 bg-white">
              {upcoming.length === 0 ? (
                <EmptyState title="Nothing upcoming" description="You're all caught up." icon={Clock3} />
              ) : (
                <div className="divide-y divide-slate-100">
                  {upcoming.map((e) => (
                    <EventRow key={e.id} event={e} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {past.length > 0 && (
            <div>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Past ({past.length})</h2>
              <div className="rounded-xl border border-slate-200 bg-white opacity-80">
                <div className="divide-y divide-slate-100">
                  {past.map((e) => (
                    <EventRow key={e.id} event={e} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
