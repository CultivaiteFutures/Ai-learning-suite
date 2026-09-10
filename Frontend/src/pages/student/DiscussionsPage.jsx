import { useState, useEffect } from "react";
import DiscussionBoard from "../../components/common/DiscussionBoard";
import { useAuthContext } from "../../context/AuthContext";
import { studentAPI } from "../../services/api";

export default function DiscussionsPage() {
  const { user } = useAuthContext();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    studentAPI
      .getEnrolledCourses()
      .then((res) => setCourses(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError("Could not load your enrolled courses."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Discussions & Doubts</h1>
        <p className="mt-1 text-sm text-slate-500">Ask a question about a course and get help from your teacher or classmates.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {!loading && courses.length === 0 && !error ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Join a course to start asking questions.
        </div>
      ) : !loading ? (
        <DiscussionBoard courses={courses} currentUserId={user?.id} canResolveAny={false} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          Loading your courses...
        </div>
      )}
    </div>
  );
}
