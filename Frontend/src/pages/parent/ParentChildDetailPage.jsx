import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  ClipboardList,
  Award,
  Flame,
  Paperclip,
  AlertTriangle,
  Inbox,
} from "lucide-react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import { formatRelativeDate } from "../../utils/formatDate";
import { parentAPI } from "../../services/api";
import PrivacyDataPanel from "../../components/common/PrivacyDataPanel";

const ASSIGNMENT_STATUS_STYLES = {
  Graded: "bg-emerald-50 text-emerald-700",
  Submitted: "bg-indigo-50 text-indigo-700",
  Overdue: "bg-rose-50 text-rose-700",
  "Not Started": "bg-amber-50 text-amber-700",
};

function AssignmentStatusPill({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        ASSIGNMENT_STATUS_STYLES[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

export default function ParentChildDetailPage() {
  const { studentId } = useParams();

  const [children, setChildren] = useState([]);
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  function loadData() {
    setLoading(true);
    setLoadError("");
    Promise.all([
      parentAPI.getChildren(),
      parentAPI.getChildStats(studentId),
      parentAPI.getChildCourses(studentId),
      parentAPI.getChildAssignments(studentId),
    ])
      .then(([childrenRes, statsRes, coursesRes, assignmentsRes]) => {
        setChildren(Array.isArray(childrenRes.data) ? childrenRes.data : []);
        setStats(statsRes.data || null);
        setCourses(Array.isArray(coursesRes.data) ? coursesRes.data : []);
        setAssignments(Array.isArray(assignmentsRes.data) ? assignmentsRes.data : []);
        setLoading(false);
      })
      .catch((err) => {
        setLoadError(
          err.response?.status === 404
            ? "This student isn't linked to your account."
            : err.response?.data?.detail || "Failed to load this child's information."
        );
        setLoading(false);
      });
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const child = useMemo(() => children.find((c) => c.id === studentId), [children, studentId]);

  const assignmentStats = useMemo(() => {
    const graded = assignments.filter((a) => a.status === "Graded");
    const avgPercent =
      graded.length > 0
        ? Math.round(
            (graded.reduce((sum, a) => sum + (a.submission?.gradePoints || 0) / (a.maxPoints || 100), 0) /
              graded.length) *
              100
          )
        : null;
    return {
      total: assignments.length,
      graded: graded.length,
      overdue: assignments.filter((a) => a.status === "Overdue").length,
      avgPercent,
    };
  }, [assignments]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Link to="/parent/dashboard" className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600">
          <ArrowLeft size={15} />
          Back to My Children
        </Link>
        <LoadingState rows={4} columns={3} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <Link to="/parent/dashboard" className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600">
          <ArrowLeft size={15} />
          Back to My Children
        </Link>
        <EmptyState title="Couldn't load this student" description={loadError} icon={AlertTriangle} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/parent/dashboard" className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600">
          <ArrowLeft size={15} />
          Back to My Children
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{child?.name || "Student"}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {child?.gradeName ? `${child.gradeName}` : ""}
          {child?.section ? ` · Section ${child.section}` : ""}
          {child?.email ? ` · ${child.email}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard label="Enrolled Courses" value={courses.length} icon={BookOpen} accent="indigo" />
        <DashboardCard label="Assignments" value={assignmentStats.total} icon={ClipboardList} accent="indigo" />
        <DashboardCard
          label="Average Grade"
          value={assignmentStats.avgPercent !== null ? `${assignmentStats.avgPercent}%` : "—"}
          icon={Award}
          accent="emerald"
        />
        <DashboardCard label="Experience Points" value={stats?.xp ?? 0} icon={Flame} accent="amber" />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Enrolled Courses</h2>
        {courses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Not enrolled in any courses yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <div key={course.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <BookOpen size={17} />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">{course.title || course.name}</p>
                {course.subject && <p className="mt-0.5 text-xs text-slate-400">{course.subject}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Assignments &amp; Grades</h2>
        </div>

        {assignments.length === 0 ? (
          <EmptyState
            title="No assignments yet"
            description="Nothing has been assigned to this student yet."
            icon={Inbox}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {assignments.map((a) => (
              <div key={a.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                    <p className="text-xs text-slate-400">{a.courseName}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {a.dueDate ? `Due ${formatRelativeDate(a.dueDate)}` : "No due date"}
                    {a.submission?.submittedAt ? ` · Submitted ${formatRelativeDate(a.submission.submittedAt)}` : ""}
                  </p>
                  {a.submission?.feedback && (
                    <p className="mt-1.5 line-clamp-1 text-xs text-slate-500">
                      Teacher feedback: {a.submission.feedback}
                    </p>
                  )}
                  {a.submission?.fileUrl && (
                    <a
                      href={a.submission.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                    >
                      <Paperclip size={12} />
                      View submitted file
                    </a>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {a.status === "Graded" ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      {a.submission.gradePoints}/{a.maxPoints}
                    </span>
                  ) : (
                    <AssignmentStatusPill status={a.status} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PrivacyDataPanel
        possessive={child?.name ? `${child.name}'s` : "your child's"}
        exportFn={() => parentAPI.exportChildData(studentId)}
        exportFilename={`${(child?.name || "child").replace(/\s+/g, "_")}_data_export.json`}
        requestDeletionFn={() => parentAPI.requestChildDeletion(studentId)}
      />
    </div>
  );
}
