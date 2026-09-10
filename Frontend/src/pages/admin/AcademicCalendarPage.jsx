import { useState, useEffect, useMemo, useCallback } from "react";
import { CalendarDays, BookOpen, Globe2, Trash2, PartyPopper, ClipboardCheck, Clock3 } from "lucide-react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import DataTable from "../../components/table/DataTable";
import TableToolbar from "../../components/table/TableToolbar";
import Pagination from "../../components/table/Pagination";
import ConfirmationDialog from "../../components/common/ConfirmationDialog";
import CalendarEventFormModal from "../../components/common/CalendarEventFormModal";
import { useDataTable } from "../../hooks/useDataTable";
import { calendarAPI, schoolAdminAPI } from "../../services/api";
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

export default function AdminAcademicCalendarPage() {
  const [events, setEvents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([calendarAPI.listEvents(), schoolAdminAPI.getCourses()])
      .then(([eventsRes, coursesRes]) => {
        setEvents(Array.isArray(eventsRes.data) ? eventsRes.data : []);
        setCourses(Array.isArray(coursesRes.data) ? coursesRes.data : []);
        setError("");
      })
      .catch(() => setError("Could not load the calendar. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const courseNameById = useMemo(() => {
    const map = {};
    courses.forEach((c) => {
      map[c.id] = c.title || c.name;
    });
    return map;
  }, [courses]);

  const enriched = useMemo(
    () =>
      events.map((e) => ({
        ...e,
        scopeLabel: e.courseId ? courseNameById[e.courseId] || "Course" : "School-wide",
      })),
    [events, courseNameById]
  );

  const {
    paginatedData,
    searchTerm,
    setSearchTerm,
    sortConfig,
    handleSort,
    currentPage,
    setCurrentPage,
    totalPages,
    pageSize,
    totalItems,
  } = useDataTable({
    data: enriched,
    searchFields: ["title", "description", "scopeLabel", "eventType"],
    defaultSort: { key: "eventDate", direction: "asc" },
  });

  async function handleSave(payload) {
    setSaving(true);
    try {
      await calendarAPI.createEvent(payload);
      setFormOpen(false);
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not create the event.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await calendarAPI.deleteEvent(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not delete the event.");
    } finally {
      setDeleting(false);
    }
  }

  const upcomingCount = events.filter((e) => e.eventDate && new Date(e.eventDate) >= new Date()).length;

  const columns = [
    { key: "title", label: "Title", sortable: true },
    {
      key: "eventType",
      label: "Type",
      render: (row) => {
        const Icon = EVENT_TYPE_ICONS[row.eventType] || CalendarDays;
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${EVENT_TYPE_STYLES[row.eventType] || "bg-slate-100 text-slate-600"}`}>
            <Icon size={12} /> {row.eventType || "event"}
          </span>
        );
      },
    },
    {
      key: "scopeLabel",
      label: "Audience",
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
          {row.courseId ? <BookOpen size={13} /> : <Globe2 size={13} />}
          {row.scopeLabel}
        </span>
      ),
    },
    {
      key: "eventDate",
      label: "Date",
      sortable: true,
      render: (row) => (row.eventDate ? new Date(row.eventDate).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—"),
    },
    {
      key: "actions",
      label: "",
      render: (row) =>
        true ? (  // Admin may delete any event in their school (backend: creator OR admin)
          <div className="flex items-center justify-end">
            <button
              onClick={() => setDeleteTarget(row)}
              className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              title="Delete"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Academic Calendar</h1>
          <p className="mt-1 text-sm text-slate-500">Schedule school-wide or course-specific exams, deadlines, and events.</p>
        </div>
        <CalendarSyncButton />
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DashboardCard label="Total Events" value={events.length} icon={CalendarDays} accent="indigo" />
        <DashboardCard label="Upcoming" value={upcomingCount} icon={Clock3} accent="emerald" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <TableToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search events..."
          onAddClick={() => setFormOpen(true)}
          addLabel="New Event"
        />

        <DataTable
          columns={columns}
          data={paginatedData}
          loading={loading}
          keyExtractor={(row) => row.id}
          sortConfig={sortConfig}
          onSort={handleSort}
          emptyTitle="No events yet"
          emptyDescription="Add an exam, deadline, or event -- it will appear here and on your students' calendars."
          emptyIcon={CalendarDays}
        />

        {!loading && totalItems > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={totalItems}
            pageSize={pageSize}
          />
        )}
      </div>

      <CalendarEventFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        courses={courses}
        allowSchoolWide={true}
        saving={saving}
      />

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete event"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
