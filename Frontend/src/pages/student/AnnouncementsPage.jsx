import { useState, useEffect } from "react";
import { Megaphone, BookOpen, Globe2 } from "lucide-react";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import { announcementsAPI } from "../../services/api";

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    announcementsAPI
      .list()
      .then((res) => {
        setAnnouncements(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => setError("Could not load announcements. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Announcements</h1>
        <p className="mt-1 text-sm text-slate-500">School-wide notices and updates from your courses.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <LoadingState rows={4} columns={1} />
        ) : announcements.length === 0 ? (
          <EmptyState
            title="No announcements yet"
            description="Updates from your school and courses will show up here."
            icon={Megaphone}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {announcements.map((a) => (
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
    </div>
  );
}
