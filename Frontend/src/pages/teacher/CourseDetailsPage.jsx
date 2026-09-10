import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2, Plus, Users, BookOpen, Calendar, Key, Copy, Check, UserPlus, X } from "lucide-react";
import StatusBadge from "../../components/common/StatusBadge";
import DataTable from "../../components/table/DataTable";
import EmptyState from "../../components/common/EmptyState";
import ConfirmationDialog from "../../components/common/ConfirmationDialog";
import AssignmentFormModal from "../../components/teacher/AssignmentFormModal";
import { useCourses } from "../../context/CourseContext";
import { useAuth } from "../../hooks/useAuth";
import { teacherAPI } from "../../services/api";

function CoTeachersPanel({ courseId, isOwner }) {
  const [coTeachers, setCoTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    teacherAPI
      .getCoTeachers(courseId)
      .then((res) => setCoTeachers(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError("Could not load co-teachers."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  function handleAdd(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    setError("");
    teacherAPI
      .addCoTeacher(courseId, email.trim())
      .then((res) => {
        setCoTeachers((prev) => [...prev, res.data]);
        setEmail("");
      })
      .catch((err) => setError(err.response?.data?.detail || "Could not add this teacher."))
      .finally(() => setAdding(false));
  }

  function handleRemove(teacherId) {
    teacherAPI
      .removeCoTeacher(courseId, teacherId)
      .then(() => setCoTeachers((prev) => prev.filter((c) => c.teacherId !== teacherId)))
      .catch(() => setError("Could not remove this co-teacher."));
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">Co-Teachers</h2>
        <p className="mt-0.5 text-xs text-slate-400">Other teachers with full manage access to this course.</p>
      </div>

      <div className="px-5 py-4">
        {error && <p className="mb-3 text-xs font-medium text-rose-600">{error}</p>}

        {loading ? (
          <p className="text-xs text-slate-400">Loading...</p>
        ) : coTeachers.length === 0 ? (
          <p className="text-xs text-slate-400">No co-teachers yet.</p>
        ) : (
          <div className="mb-4 flex flex-wrap gap-2">
            {coTeachers.map((c) => (
              <span key={c.teacherId} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                {c.name}
                {isOwner && (
                  <button type="button" onClick={() => handleRemove(c.teacherId)} className="text-slate-400 hover:text-rose-600">
                    <X size={12} />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}

        {isOwner && (
          <form onSubmit={handleAdd} className="flex items-center gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@school.edu"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={adding}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <UserPlus size={14} /> Add
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function CourseDetailsPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { getCourseById, deleteCourse, getAssignmentsByCourse, addAssignment, updateAssignment, deleteAssignment, courseError, clearCourseError, coursesLoading } =
    useCourses();
  const { user, role } = useAuth();

  const course = getCourseById(courseId);

  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [deleteAssignmentTarget, setDeleteAssignmentTarget] = useState(null);
  const [deleteCourseOpen, setDeleteCourseOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    // Real per-course roster from Enrollment records -- not a grade-level approximation.
    teacherAPI.getCourseStudents(courseId).then((res) => {
      if (res.data && Array.isArray(res.data)) {
        setStudents(res.data);
      }
    }).catch(() => {}).finally(() => setStudentsLoading(false));
  }, [courseId]);

  if (!course && coursesLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        Loading course...
      </div>
    );
  }

  if (!course) {
    return (
      <EmptyState
        title="Course not found"
        description="This course may have been deleted or the link is incorrect."
        action={
          <Link to="/teacher/courses" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            Back to My Courses
          </Link>
        }
      />
    );
  }

  const assignments = getAssignmentsByCourse(course.id);
  const joinCode = course.joinCode || course.join_code || "";

  function copyJoinCode() {
    if (!joinCode) return;
    navigator.clipboard.writeText(joinCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  function openCreateAssignment() {
    setEditingAssignment(null);
    setAssignmentModalOpen(true);
  }

  function openEditAssignment(assignment) {
    setEditingAssignment(assignment);
    setAssignmentModalOpen(true);
  }

  function handleSaveAssignment(data) {
    const result = editingAssignment
      ? updateAssignment(editingAssignment.id, data)
      : addAssignment({ ...data, courseId: course.id });
    setAssignmentModalOpen(false);
    return result;
  }

  function confirmDeleteAssignment() {
    deleteAssignment(deleteAssignmentTarget.id);
    setDeleteAssignmentTarget(null);
  }

  async function confirmDeleteCourse() {
    setDeleting(true);
    const ok = await deleteCourse(course.id);
    setDeleting(false);
    if (ok) {
      navigate("/teacher/courses");
    } else {
      setDeleteCourseOpen(false);
    }
  }

  const assignmentColumns = [
    { key: "title", label: "Title" },
    { key: "type", label: "Type", render: (row) => row.type || "Assignment" },
    { key: "dueDate", label: "Due Date" },
    { key: "maxPoints", label: "Max Points", render: (row) => row.maxPoints || row.max_points || 100 },
    { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status || "open"} /> },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => openEditAssignment(row)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => setDeleteAssignmentTarget(row)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  const studentColumns = [
    {
      key: "name",
      label: "Name",
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-500">{row.email}</p>
        </div>
      ),
    },
    { key: "grade", label: "Grade", render: (row) => row.grade || "N/A" },
    { key: "xp", label: "XP", render: (row) => `${row.xp || 0} XP` },
    { key: "streak", label: "Streak", render: (row) => `${row.streak || 0} days` },
  ];

  return (
    <div className="space-y-6">
      {courseError && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>{courseError}</span>
          <button onClick={clearCourseError} className="font-medium text-rose-600 hover:underline">
            Dismiss
          </button>
        </div>
      )}
      <div>
        <Link
          to="/teacher/courses"
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={15} />
          Back to My Courses
        </Link>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-900">{course.name}</h1>
              <StatusBadge status={course.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {course.subject} · {course.grade}
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              to={`/teacher/courses/${course.id}/edit`}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Pencil size={15} /> Edit Course
            </Link>
            <button
              onClick={() => setDeleteCourseOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
            >
              <Trash2 size={15} /> Delete
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Description</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{course.description || "No description added yet."}</p>
          <div className="mt-4 flex flex-wrap gap-6 border-t border-slate-100 pt-4 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <Users size={15} /> {course.studentsEnrolled || 0} students enrolled
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpen size={15} /> {course.lessonsCount || 0} lessons
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar size={15} /> Created {course.createdDate || "Recently"}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-indigo-900">
              <Key size={16} /> Course Join Code
            </h2>
            <button
              onClick={copyJoinCode}
              disabled={!joinCode}
              className="flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copiedCode ? <Check size={13} /> : <Copy size={13} />}
              {copiedCode ? "Copied!" : "Copy Code"}
            </button>
          </div>
          <p className="mt-2 text-xs text-indigo-700">Share this code with students to let them enroll in this course.</p>
          <div className="mt-3 rounded-lg border border-indigo-200 bg-white py-3 text-center">
            {joinCode ? (
              <span className="font-mono text-2xl font-black tracking-widest text-indigo-900">{joinCode}</span>
            ) : (
              <span className="text-sm font-medium text-slate-400">No join code available</span>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Assignments</h2>
          <button
            onClick={openCreateAssignment}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            <Plus size={14} /> Add Assignment
          </button>
        </div>
        <DataTable
          columns={assignmentColumns}
          data={assignments}
          loading={false}
          keyExtractor={(row) => row.id}
          emptyTitle="No assignments yet"
          emptyDescription="Create your first assignment for this course."
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Enrolled Students</h2>
        </div>
        <DataTable
          columns={studentColumns}
          data={students}
          loading={studentsLoading}
          keyExtractor={(row) => row.id}
          emptyTitle="No students enrolled yet"
          emptyDescription="Students will appear here once they join using the Course Join Code."
        />
      </div>

      <CoTeachersPanel
        courseId={course.id}
        isOwner={role === "admin" || (user && user.id === course.createdById)}
      />

      <AssignmentFormModal
        isOpen={assignmentModalOpen}
        onClose={() => setAssignmentModalOpen(false)}
        onSave={handleSaveAssignment}
        initialData={editingAssignment}
        lockCourseId={course.id}
      />

      <ConfirmationDialog
        isOpen={!!deleteAssignmentTarget}
        onClose={() => setDeleteAssignmentTarget(null)}
        onConfirm={confirmDeleteAssignment}
        title="Delete assignment"
        message={`Are you sure you want to delete "${deleteAssignmentTarget?.title}"?`}
        confirmLabel="Delete"
      />

      <ConfirmationDialog
        isOpen={deleteCourseOpen}
        onClose={() => setDeleteCourseOpen(false)}
        onConfirm={confirmDeleteCourse}
        loading={deleting}
        title="Delete course"
        message={`Are you sure you want to delete "${course.name}"? This will also remove its assignments.`}
        confirmLabel="Delete"
      />
    </div>
  );
}