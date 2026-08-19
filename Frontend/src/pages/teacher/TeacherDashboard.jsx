import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ClipboardCheck, ClipboardList, Users, Plus, ArrowRight } from "lucide-react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import StatusBadge from "../../components/common/StatusBadge";
import { useCourses } from "../../context/CourseContext";
import { teacherAPI } from "../../services/api";

export default function TeacherDashboard() {
  const { courses, assignments } = useCourses();
  const [students, setStudents] = useState([]);

  useEffect(() => {
    teacherAPI.getStudents().then((res) => {
      if (res.data && Array.isArray(res.data)) {
        setStudents(res.data);
      }
    }).catch(() => {});
  }, []);

  const pendingGrading = assignments.filter((a) => a.status === "grading" || a.submissionsCount < (a.totalStudents || 1)).length;
  const recentCourses = [...courses].sort((a, b) => new Date(b.createdDate || 0) - new Date(a.createdDate || 0)).slice(0, 5);
  const upcomingAssignments = [...assignments]
    .filter((a) => a.status !== "closed")
    .sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0))
    .slice(0, 5);

  const courseNameById = Object.fromEntries(courses.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Teacher Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your courses, assignments, and student progress.</p>
        </div>
        <Link
          to="/teacher/courses/create"
          className="flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Plus size={16} /> Create Course
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard label="My Courses" value={courses.length} icon={BookOpen} accent="indigo" />
        <DashboardCard label="Pending Grading" value={pendingGrading} icon={ClipboardCheck} accent="amber" />
        <DashboardCard label="Total Assignments" value={assignments.length} icon={ClipboardList} accent="emerald" />
        <DashboardCard label="Students" value={students.length} icon={Users} accent="rose" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Recent Courses</h2>
            <Link to="/teacher/courses" className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentCourses.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-400">No courses yet. Create your first one.</p>
            ) : (
              recentCourses.map((c) => (
                <Link key={c.id} to={`/teacher/courses/${c.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-500">
                      {c.subject} · {c.grade}
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Upcoming Assignments</h2>
            <Link to="/teacher/assignments" className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {upcomingAssignments.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-400">No upcoming assignments.</p>
            ) : (
              upcomingAssignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{a.title}</p>
                    <p className="text-xs text-slate-500">
                      {courseNameById[a.courseId] || "Unknown course"} · Due {a.dueDate || "N/A"}
                    </p>
                  </div>
                  <StatusBadge status={a.status || "open"} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}