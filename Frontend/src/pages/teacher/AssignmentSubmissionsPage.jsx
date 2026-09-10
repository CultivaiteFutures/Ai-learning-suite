import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Inbox,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Paperclip,
} from "lucide-react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import { useCourses } from "../../context/CourseContext";
import { teacherAPI } from "../../services/api";
import { formatRelativeDate } from "../../utils/formatDate";

// Best-effort one-line preview of a submission's content. Real auto-graded
// quiz submissions store a JSON blob ({answers, correct, total}) rather than
// free text -- show a friendly summary of that instead of raw JSON when it
// parses that way, otherwise fall back to the plain text itself.
function getContentPreview(submission) {
  if (!submission.content) return "";
  try {
    const parsed = JSON.parse(submission.content);
    if (parsed && Array.isArray(parsed.answers)) {
      return `Quiz answers: ${parsed.correct ?? "?"}/${parsed.total ?? "?"} correct`;
    }
  } catch {
    // Not JSON -- treat as plain text below.
  }
  return submission.content;
}

function SubmissionListRow({ assignmentId, submission, student, maxPoints }) {
  const isGraded = submission.gradePoints !== null && submission.gradePoints !== undefined;
  const preview = getContentPreview(submission);

  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p className="text-sm font-semibold text-slate-900">{student?.name || "Unknown student"}</p>
          <p className="text-xs text-slate-400">{student?.email || submission.studentId}</p>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Submitted {submission.submittedAt ? formatRelativeDate(submission.submittedAt) : "—"}
        </p>
        {preview && <p className="mt-1.5 line-clamp-1 text-xs text-slate-500">{preview}</p>}
        {submission.fileUrl && (
          <a
            href={submission.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            <Paperclip size={12} />
            Attached file
          </a>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {isGraded ? (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            Graded: {submission.gradePoints}/{maxPoints}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
            Not graded yet
          </span>
        )}

        <Link
          to={`/teacher/assignments/${assignmentId}/submissions/${submission.id}`}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold shadow-sm transition ${
            isGraded
              ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              : "bg-indigo-600 text-white hover:bg-indigo-700"
          }`}
        >
          {isGraded ? "View / Edit Grade" : "Grade Submission"}
          <ChevronRight size={13} />
        </Link>
      </div>
    </div>
  );
}

export default function AssignmentSubmissionsPage() {
  const { assignmentId } = useParams();
  const { assignments, assignmentsLoading, courses } = useCourses();
  const [submissions, setSubmissions] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const assignment = assignments.find((a) => a.id === assignmentId);
  const course = assignment ? courses.find((c) => c.id === assignment.courseId) : null;

  const loadData = useCallback(() => {
    setLoading(true);
    setLoadError("");
    Promise.all([teacherAPI.getSubmissions(assignmentId), teacherAPI.getStudents()])
      .then(([subsRes, studentsRes]) => {
        setSubmissions(Array.isArray(subsRes.data) ? subsRes.data : []);
        setStudents(Array.isArray(studentsRes.data) ? studentsRes.data : []);
        setLoading(false);
      })
      .catch((err) => {
        setLoadError(err.response?.data?.detail || "Failed to load submissions.");
        setLoading(false);
      });
  }, [assignmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const studentMap = useMemo(() => {
    const map = {};
    students.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [students]);

  const stats = useMemo(() => {
    const total = submissions.length;
    const graded = submissions.filter((s) => s.gradePoints !== null && s.gradePoints !== undefined).length;
    return { total, graded, ungraded: total - graded };
  }, [submissions]);

  // Assignment context is still loading (no assignments fetched yet, still empty).
  if (assignmentsLoading && !assignment) {
    return (
      <div className="space-y-6">
        <Link to="/teacher/assignments" className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600">
          <ArrowLeft size={15} />
          Back to Assignments
        </Link>
        <LoadingState rows={4} columns={2} />
      </div>
    );
  }

  // Assignments have loaded and this id genuinely doesn't exist.
  if (!assignment) {
    return (
      <div className="space-y-6">
        <Link to="/teacher/assignments" className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600">
          <ArrowLeft size={15} />
          Back to Assignments
        </Link>
        <EmptyState
          title="Assignment not found"
          description="This assignment doesn't exist or you don't have access to it."
          icon={AlertTriangle}
        />
      </div>
    );
  }

  const maxPoints = assignment.maxPoints || 100;
  const hasAnswerKey = Boolean(assignment.answerKey);

  return (
    <div className="space-y-6">
      <div>
        <Link to="/teacher/assignments" className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600">
          <ArrowLeft size={15} />
          Back to Assignments
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{assignment.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {course?.name ? `${course.name} · ` : ""}Max points: {maxPoints}
          {!hasAnswerKey && " · No answer key configured (AI suggestions disabled)"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashboardCard label="Total Submissions" value={stats.total} icon={ClipboardCheck} accent="indigo" />
        <DashboardCard label="Graded" value={stats.graded} icon={CheckCircle2} accent="emerald" />
        <DashboardCard label="Awaiting Grading" value={stats.ungraded} icon={Clock} accent="amber" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Submissions</h2>
        </div>

        {loading ? (
          <LoadingState rows={4} columns={2} />
        ) : loadError ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium text-rose-600">{loadError}</p>
            <button
              onClick={loadData}
              className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Try again
            </button>
          </div>
        ) : submissions.length === 0 ? (
          <EmptyState
            title="No submissions yet"
            description="Students haven't submitted this assignment yet. Check back later."
            icon={Inbox}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {submissions.map((s) => (
              <SubmissionListRow
                key={s.id}
                assignmentId={assignmentId}
                submission={s}
                student={studentMap[s.studentId]}
                maxPoints={maxPoints}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
