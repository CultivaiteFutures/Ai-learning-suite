import { useState, useEffect, useCallback } from "react";
import { Megaphone, BookOpen, Globe2 } from "lucide-react";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import DiscussionBoard from "../../components/common/DiscussionBoard";
import { useAuthContext } from "../../context/AuthContext";
import { announcementsAPI, studentAPI } from "../../services/api";

export default function LearningCommunityPage() {
  const { user } = useAuthContext();

  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [announcementsError, setAnnouncementsError] = useState("");

  const loadCourses = useCallback(() => {
    setCoursesLoading(true);
    studentAPI
      .getEnrolledCourses()
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Learning Community</h1>
        <p className="mt-1 text-sm text-slate-500">
          Announcements, discussions, and creative work shared by your classmates -- all in one place.
        </p>
      </div>

      {/* Announcements */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Announcements</h2>
        </div>
        {announcementsError && <div className="px-5 pt-3 text-sm text-rose-600">{announcementsError}</div>}
        {announcementsLoading ? (
          <LoadingState rows={3} columns={1} />
        ) : announcements.length === 0 ? (
          <EmptyState title="No announcements yet" description="Updates from your school and courses will show up here." icon={Megaphone} />
        ) : (
          <div className="divide-y divide-slate-100">
            {announcements.slice(0, 5).map((a) => (
              <div key={a.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-900">{a.title}</h3>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {a.courseId ? <BookOpen size={12} /> : <Globe2 size={12} />}
                    {a.courseId ? "Course" : "School-wide"}
                  </span>
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
            Join a course to start asking questions.
          </div>
        ) : (
          <DiscussionBoard courses={courses} currentUserId={user?.id} canResolveAny={false} />
        )}
      </div>
    </div>
  );
}
