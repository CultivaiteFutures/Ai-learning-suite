import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CourseProvider } from "./context/CourseContext";
import { StudentProgressProvider } from "./context/StudentProgressContext";
import { TutorChatProvider } from "./context/TutorChatContext";
import { SchoolProvider } from "./context/SchoolContext";
import DashboardLayout from "./layouts/DashboardLayout";
import LoginPage from "./pages/auth/LoginPage";
import PlaceholderPage from "./components/common/PlaceholderPage";

import PlatformDashboard from "./pages/superadmin/PlatformDashboard";
import SchoolsPage from "./pages/superadmin/SchoolsPage";
import SchoolDetailsPage from "./pages/superadmin/SchoolDetailsPage";
import SubscriptionsPage from "./pages/superadmin/SubscriptionsPage";
import PlatformSettingsPage from "./pages/superadmin/PlatformSettingsPage";
import ActivityLogPage from "./pages/superadmin/ActivityLogPage";

import AdminDashboard from "./pages/admin/AdminDashboard";
import TeachersPage from "./pages/admin/TeachersPage";
import StudentsPage from "./pages/admin/StudentsPage";
import GradesPage from "./pages/admin/GradesPage";

import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import MyCoursesPage from "./pages/teacher/MyCoursesPage";
import CourseBuilderPage from "./pages/teacher/CourseBuilderPage";
import CourseDetailsPage from "./pages/teacher/CourseDetailsPage";
import AICourseBuilderPage from "./pages/teacher/AICourseBuilderPage";
import AssignmentsPage from "./pages/teacher/AssignmentsPage";
import TeacherStudentsPage from "./pages/teacher/TeacherStudentsPage";
import AnalyticsPage from "./pages/teacher/AnalyticsPage";

import StudentDashboard from "./pages/student/StudentDashboard";
import StudentMyCoursesPage from "./pages/student/MyCoursesPage";
import CoursePlayerPage from "./pages/student/CoursePlayerPage";
import AITutorPage from "./pages/student/AITutorPage";

export default function App() {
  return (
    <AuthProvider>
      <SchoolProvider>
        <CourseProvider>
          <StudentProgressProvider>
            <TutorChatProvider>
                <Routes>
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  <Route path="/login" element={<LoginPage />} />

                  <Route element={<DashboardLayout />}>
                    {/* Super Admin */}
                    <Route path="/super-admin/dashboard" element={<PlatformDashboard />} />
                    <Route path="/super-admin/schools" element={<SchoolsPage />} />
                    <Route path="/super-admin/schools/:schoolId" element={<SchoolDetailsPage />} />
                    <Route path="/super-admin/subscriptions" element={<SubscriptionsPage />} />
                    <Route path="/super-admin/platform-settings" element={<PlatformSettingsPage />} />
                    <Route path="/super-admin/activity" element={<ActivityLogPage />} />

                    {/* Admin */}
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/admin/teachers" element={<TeachersPage />} />
                    <Route path="/admin/students" element={<StudentsPage />} />
                    <Route path="/admin/grades" element={<GradesPage />} />
                    <Route path="/admin/reports" element={<PlaceholderPage title="Reports" description="Generate and export school performance reports." />} />
                    <Route path="/admin/settings" element={<PlaceholderPage title="Settings" description="Configure school profile, branding, and preferences." />} />

                    {/* Teacher */}
                    <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
                    <Route path="/teacher/courses" element={<MyCoursesPage />} />
                    <Route path="/teacher/courses/create" element={<CourseBuilderPage />} />
                    <Route path="/teacher/courses/:courseId/edit" element={<CourseBuilderPage />} />
                    <Route path="/teacher/courses/:courseId" element={<CourseDetailsPage />} />
                    <Route path="/teacher/ai-course-builder" element={<AICourseBuilderPage />} />
                    <Route path="/teacher/assignments" element={<AssignmentsPage />} />
                    <Route path="/teacher/students" element={<TeacherStudentsPage />} />
                    <Route path="/teacher/analytics" element={<AnalyticsPage />} />

                    {/* Student */}
                    <Route path="/student/dashboard" element={<StudentDashboard />} />
                    <Route path="/student/courses" element={<StudentMyCoursesPage />} />
                    <Route path="/student/courses/:courseId/learn" element={<CoursePlayerPage />} />
                    <Route path="/student/ai-tutor" element={<AITutorPage />} />
                    <Route path="/student/practice" element={<PlaceholderPage title="Practice" description="Sharpen your skills with practice exercises." />} />
                    <Route path="/student/rewards" element={<PlaceholderPage title="Rewards" description="See the points and badges you've earned." />} />
                    <Route path="/student/profile" element={<PlaceholderPage title="Profile" description="Manage your personal profile and preferences." />} />
                  </Route>

                  <Route path="*" element={<div className="p-8">404 — Page not found</div>} />
                </Routes>
            </TutorChatProvider>
          </StudentProgressProvider>
        </CourseProvider>
      </SchoolProvider>
    </AuthProvider>
  );
}