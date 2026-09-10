import { useState, useEffect, useCallback } from "react";
import { Megaphone, BookOpen, Globe2, Trash2, Plus } from "lucide-react";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import DiscussionBoard from "../../components/common/DiscussionBoard";
import AnnouncementFormModal from "../../components/common/AnnouncementFormModal";
import ConfirmationDialog from "../../components/common/ConfirmationDialog";
import { useAuthContext } from "../../context/AuthContext";
import { announcementsAPI, teacherAPI } from "../../services/api";

export default function LearningCommunityPage() {
  const { user } = useAuthContext();

  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [announcementsError, setAnnouncementsError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadCourses = useCallback(() => {
    setCoursesLoading(true);
    teacherAPI
      .getCourses()
      .then((res) => setCourses(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setCoursesLoading(false));
  }, []);

  const loadAnnouncements = useCallback(() => {
    setAnnouncementsLoading(true);
    announcementsAPI
      .list()
      .then((res) => {
        setAnnouncements(Array.isArray(res.data) ? res.data : []);
        setAnnouncementsError("");
      })
      .catch(() => setAnnouncementsError("Could not load announcements."))
      .finally(() => setAnnouncementsLoading(false));
  }, []);

  useEffect(() => {
    loadCourses();
    loadAnnouncements();
  }, [loadCourses, loadAnnouncements]);

  async function handleSaveAnnouncement(payload) {
    setSaving(true);
    try {
      await announcementsAPI.create(payload);
      setFormOpen(false);
      loadAnnouncements();
    } catch (err) {
      setAnnouncementsError(err?.response?.data?.detail || "Could not post the announcement.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteAnnouncement() {
    setDeleting(true);
    try {
      await announcementsAPI.remove(deleteTarget.id);
      setDeleteTarget(null);
      loadAnnouncements();
    } catch (err) {
      setAnnouncementsError(err?.response?.data?.detail || "Could not delete the announcement.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Learning Community</h1>
        <p className="mt-1 text-sm text-slate-500">
          Post announcements, answer discussions, and see creative work your students have shared.
        </p>
      </div>

      {/* Announcements */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Announcements</h2>
          <button
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            <Plus size={14} />
            New Announcement
          </button>
        </div>
        {announcementsError && <div className="px-5 pt-3 text-sm text-rose-600">{announcementsError}</div>}
        {announcementsLoading ? (
          <LoadingState rows={3} columns={1} />
        ) : announcements.length === 0 ? (
          <EmptyState title="No announcements yet" description="Post your first announcement to keep students updated." icon={Megaphone} />
        ) : (
          <div className="divide-y divide-slate-100">
            {announcements.slice(0, 5).map((a) => (
              <div key={a.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-900">{a.title}</h3>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {a.courseId ? <BookOpen size={12} /> : <Globe2 size={12} />}
                      {a.courseId ? "Course" : "School-wide"}
                    </span>
                    {a.authorId === user?.id && (
                      <button
                        onClick={() => setDeleteTarget(a)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{a.content}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                  {a.authorName && <span>{a.authorName}</span>}
                  {a.authorName && a.createdAt && <span>&middot;</span>}
                  {a.createdAt && <span>{new Date(a.createdAt).toLocaleString()}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Discussions */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-slate-900">Discussions & Doubts</h2>
        {coursesLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">Loading your courses...</div>
        ) : courses.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            You have no courses yet. Discussions become available once you have a course.
          </div>
        ) : (
          <DiscussionBoard courses={courses} currentUserId={user?.id} canResolveAny={true} />
        )}
      </div>

      <AnnouncementFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSaveAnnouncement}
        courses={courses}
        allowSchoolWide={false}
        saving={saving}
      />

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteAnnouncement}
        title="Delete announcement"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
