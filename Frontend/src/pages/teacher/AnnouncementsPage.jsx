import { useState, useEffect, useMemo, useCallback } from "react";
import { Megaphone, BookOpen, Globe2, Trash2 } from "lucide-react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import DataTable from "../../components/table/DataTable";
import TableToolbar from "../../components/table/TableToolbar";
import Pagination from "../../components/table/Pagination";
import ConfirmationDialog from "../../components/common/ConfirmationDialog";
import AnnouncementFormModal from "../../components/common/AnnouncementFormModal";
import { useDataTable } from "../../hooks/useDataTable";
import { useAuthContext } from "../../context/AuthContext";
import { announcementsAPI, teacherAPI } from "../../services/api";

export default function AnnouncementsPage() {
  const { user } = useAuthContext();
  const [announcements, setAnnouncements] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([announcementsAPI.list(), teacherAPI.getCourses()])
      .then(([annRes, courseRes]) => {
        setAnnouncements(Array.isArray(annRes.data) ? annRes.data : []);
        setCourses(Array.isArray(courseRes.data) ? courseRes.data : []);
        setError("");
      })
      .catch(() => setError("Could not load announcements. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const courseNameById = useMemo(() => {
    const map = {};
    courses.forEach((c) => {
      map[c.id] = c.title;
    });
    return map;
  }, [courses]);

  const enriched = useMemo(
    () =>
      announcements.map((a) => ({
        ...a,
        scopeLabel: a.courseId ? courseNameById[a.courseId] || "Course" : "School-wide",
      })),
    [announcements, courseNameById]
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
    searchFields: ["title", "content", "scopeLabel"],
    defaultSort: { key: "createdAt", direction: "desc" },
  });

  async function handleSave(payload) {
    setSaving(true);
    try {
      await announcementsAPI.create(payload);
      setFormOpen(false);
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not post the announcement.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await announcementsAPI.remove(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not delete the announcement.");
    } finally {
      setDeleting(false);
    }
  }

  const columns = [
    { key: "title", label: "Title", sortable: true },
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
      key: "content",
      label: "Content",
      render: (row) => <span className="line-clamp-1 block max-w-md text-slate-600">{row.content}</span>,
    },
    {
      key: "createdAt",
      label: "Posted",
      sortable: true,
      render: (row) => (row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—"),
    },
    {
      key: "actions",
      label: "",
      render: (row) =>
        row.authorId === user?.id ? (
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
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Announcements</h1>
        <p className="mt-1 text-sm text-slate-500">Post updates to your courses and review what's already been shared.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DashboardCard label="Total Announcements" value={announcements.length} icon={Megaphone} accent="indigo" />
        <DashboardCard
          label="Course-Scoped"
          value={announcements.filter((a) => a.courseId).length}
          icon={BookOpen}
          accent="emerald"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <TableToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search announcements..."
          onAddClick={() => setFormOpen(true)}
          addLabel="New Announcement"
        />

        <DataTable
          columns={columns}
          data={paginatedData}
          loading={loading}
          keyExtractor={(row) => row.id}
          sortConfig={sortConfig}
          onSort={handleSort}
          emptyTitle="No announcements yet"
          emptyDescription="Post your first announcement to keep students updated."
          emptyIcon={Megaphone}
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

      <AnnouncementFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        courses={courses}
        allowSchoolWide={false}
        saving={saving}
      />

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete announcement"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
