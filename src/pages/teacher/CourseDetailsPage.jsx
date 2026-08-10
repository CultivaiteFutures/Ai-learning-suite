import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2, Plus, Users, BookOpen, Calendar } from "lucide-react";
import StatusBadge from "../../components/common/StatusBadge";
import DataTable from "../../components/table/DataTable";
import EmptyState from "../../components/common/EmptyState";
import ConfirmationDialog from "../../components/common/ConfirmationDialog";
import AssignmentFormModal from "../../components/teacher/AssignmentFormModal";
import { useCourses } from "../../context/CourseContext";
import mockTeacherStudents from "../../data/mockTeacherStudents.json";

export default function CourseDetailsPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { getCourseById, deleteCourse, getAssignmentsByCourse, addAssignment, updateAssignment, deleteAssignment } =
    useCourses();

  const course = getCourseById(courseId);

  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [deleteAssignmentTarget, setDeleteAssignmentTarget] = useState(null);
  const [deleteCourseOpen, setDeleteCourseOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
  const enrolledStudents = mockTeacherStudents.filter((s) => s.grade === course.grade);

  function openCreateAssignment() {
    setEditingAssignment(null);
    setAssignmentModalOpen(true);
  }

  function openEditAssignment(assignment) {
    setEditingAssignment(assignment);
    setAssignmentModalOpen(true);
  }

  function handleSaveAssignment(data) {
    if (editingAssignment) {
      updateAssignment(editingAssignment.id, data);
    } else {
      addAssignment({ ...data, courseId: course.id });
    }
    setAssignmentModalOpen(false);
  }

  function confirmDeleteAssignment() {
    deleteAssignment(deleteAssignmentTarget.id);
    setDeleteAssignmentTarget(null);
  }

  function confirmDeleteCourse() {
    setDeleting(true);
    setTimeout(() => {
      deleteCourse(course.id);
      setDeleting(false);
      navigate("/teacher/courses");
    }, 500);
  }

  const assignmentColumns = [
    { key: "title", label: "Title" },
    { key: "type", label: "Type" },
    { key: "dueDate", label: "Due Date" },
    { key: "submissionsCount", label: "Submissions", render: (row) => `${row.submissionsCount}/${row.totalStudents}` },
    { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
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
    { key: "section", label: "Section", render: (row) => `Section ${row.section}` },
    { key: "averageGrade", label: "Avg. Grade", render: (row) => `${row.averageGrade}%` },
    { key: "attendance", label: "Attendance", render: (row) => `${row.attendance}%` },
    { key: "lastActive", label: "Last Active" },
  ];

  return (
    <div className="space-y-6">
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
              <Pencil size={15} /> Edit
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

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Description</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{course.description || "No description added yet."}</p>
        <div className="mt-4 flex flex-wrap gap-6 border-t border-slate-100 pt-4 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <Users size={15} /> {course.studentsEnrolled} students enrolled
          </span>
          <span className="flex items-center gap-1.5">
            <BookOpen size={15} /> {course.lessonsCount} lessons
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar size={15} /> Created {course.createdDate}
          </span>
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
          data={enrolledStudents}
          loading={false}
          keyExtractor={(row) => row.id}
          emptyTitle="No students enrolled"
          emptyDescription="Students matching this grade level will appear here once enrolled."
        />
      </div>

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