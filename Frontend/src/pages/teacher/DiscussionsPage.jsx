import { useState, useEffect } from "react";
import DiscussionBoard from "../../components/common/DiscussionBoard";
import { useAuthContext } from "../../context/AuthContext";
import { teacherAPI } from "../../services/api";

export default function DiscussionsPage() {
  const { user } = useAuthContext();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    teacherAPI
      .getCourses()
      .then((res) => setCourses(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError("Could not load your courses."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Discussions & Doubts</h1>
        <p className="mt-1 text-sm text-slate-500">Answer student questions and keep track of what's still open.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {!loading && courses.length === 0 && !error ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          You have no courses yet. Discussions become available once you have a course.
        </div>
      ) : !loading ? (
        <DiscussionBoard courses={courses} currentUserId={user?.id} canResolveAny={true} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          Loading your courses...
        </div>
      )}
    </div>
  );
}
