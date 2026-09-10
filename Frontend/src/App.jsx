import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CourseProvider } from "./context/CourseContext";
import { StudentProgressProvider } from "./context/StudentProgressContext";
import { TutorChatProvider } from "./context/TutorChatContext";
import { SchoolProvider } from "./context/SchoolContext";
import DashboardLayout from "./layouts/DashboardLayout";
import RoleRoute from "./components/routing/RoleRoute";
import LandingPage from "./pages/marketing/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import SsoCallbackPage from "./pages/auth/SsoCallbackPage";
import PrivacyPolicyPage from "./pages/legal/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/legal/TermsOfServicePage";
import DataProcessingAgreementPage from "./pages/legal/DataProcessingAgreementPage";

import PlatformDashboard from "./pages/superadmin/PlatformDashboard";
import SchoolsPage from "./pages/superadmin/SchoolsPage";
import SchoolDetailsPage from "./pages/superadmin/SchoolDetailsPage";
import SubscriptionsPage from "./pages/superadmin/SubscriptionsPage";
import PlatformSettingsPage from "./pages/superadmin/PlatformSettingsPage";
import SuperAdminComplaintsPage from "./pages/superadmin/ComplaintsPage";
import ActivityLogPage from "./pages/superadmin/ActivityLogPage";
import AiUsagePage from "./pages/superadmin/AiUsagePage";

import AdminDashboard from "./pages/admin/AdminDashboard";
import TeachersPage from "./pages/admin/TeachersPage";
import StudentsPage from "./pages/admin/StudentsPage";
import ParentsPage from "./pages/admin/ParentsPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import AdminActivityLogPage from "./pages/admin/ActivityLogPage";
import DataRequestsPage from "./pages/admin/DataRequestsPage";
import ComplaintsPage from "./pages/admin/ComplaintsPage";

import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import MyCoursesPage from "./pages/teacher/MyCoursesPage";
import CourseBuilderPage from "./pages/teacher/CourseBuilderPage";
import CourseDetailsPage from "./pages/teacher/CourseDetailsPage";
import AICourseBuilderPage from "./pages/teacher/AICourseBuilderPage";
import AssignmentsPage from "./pages/teacher/AssignmentsPage";
import AssignmentSubmissionsPage from "./pages/teacher/AssignmentSubmissionsPage";
import GradeSubmissionPage from "./pages/teacher/GradeSubmissionPage";
import StudentReportsPage from "./pages/teacher/StudentReportsPage";
import AnalyticsPage from "./pages/teacher/AnalyticsPage";
import TeacherSettingsPage from "./pages/teacher/TeacherSettingsPage";

import StudentDashboard from "./pages/student/StudentDashboard";
import StudentMyCoursesPage from "./pages/student/MyCoursesPage";
import CoursePlayerPage from "./pages/student/CoursePlayerPage";
import AITutorPage from "./pages/student/AITutorPage";
import StudentAssignmentsPage from "./pages/student/StudentAssignmentsPage";
import StudentRewardsPage from "./pages/student/StudentRewardsPage";
import StudentProfilePage from "./pages/student/StudentProfilePage";

import TeacherAnnouncementsPage from "./pages/teacher/AnnouncementsPage";
import AdminAnnouncementsPage from "./pages/admin/AnnouncementsPage";
import StudentAnnouncementsPage from "./pages/student/AnnouncementsPage";
import TeacherDiscussionsPage from "./pages/teacher/DiscussionsPage";
import StudentDiscussionsPage from "./pages/student/DiscussionsPage";
import TeacherAcademicCalendarPage from "./pages/teacher/AcademicCalendarPage";
import StudentAcademicCalendarPage from "./pages/student/AcademicCalendarPage";
import TeacherChallengesPage from "./pages/teacher/ChallengesPage";
import AdminChallengesPage from "./pages/admin/ChallengesPage";
import StudentChallengesPage from "./pages/student/ChallengesPage";
import ManageGamesPage from "./pages/teacher/ManageGamesPage";
import FunGamesPage from "./pages/student/FunGamesPage";
import AdminAcademicCalendarPage from "./pages/admin/AcademicCalendarPage";

import ParentDashboardPage from "./pages/parent/ParentDashboardPage";
import ParentChildDetailPage from "./pages/parent/ParentChildDetailPage";
import ParentAnnouncementsPage from "./pages/parent/AnnouncementsPage";
import ParentAcademicCalendarPage from "./pages/parent/AcademicCalendarPage";
import TeacherMessagesPage from "./pages/teacher/MessagesPage";
import StudentMessagesPage from "./pages/student/MessagesPage";
import ParentMessagesPage from "./pages/parent/MessagesPage";
import TeacherAttendancePage from "./pages/teacher/AttendancePage";
import StudentAttendancePage from "./pages/student/AttendancePage";
import ParentAttendancePage from "./pages/parent/AttendancePage";
import TeacherRubricsPage from "./pages/teacher/RubricsPage";

export default function App() {
  return (
    <AuthProvider>
      <SchoolProvider>
        <CourseProvider>
          <StudentProgressProvider>
            <TutorChatProvider>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/sso-callback" element={<SsoCallbackPage />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                  <Route path="/terms-of-service" element={<TermsOfServicePage />} />
                  <Route path="/dpa" element={<DataProcessingAgreementPage />} />

                  <Route element={<DashboardLayout />}>
                    {/* Super Admin -- role-gated: only super_admin may reach these */}
                    <Route element={<RoleRoute allow={["super_admin"]} />}>
                      <Route path="/super-admin/dashboard" element={<PlatformDashboard />} />
                      <Route path="/super-admin/schools" element={<SchoolsPage />} />
                      <Route path="/super-admin/schools/:schoolId" element={<SchoolDetailsPage />} />
                      <Route path="/super-admin/subscriptions" element={<SubscriptionsPage />} />
                      <Route path="/super-admin/platform-settings" element={<PlatformSettingsPage />} />
                      <Route path="/super-admin/complaints" element={<SuperAdminComplaintsPage />} />
                      <Route path="/super-admin/activity" element={<ActivityLogPage />} />
                      <Route path="/super-admin/ai-usage" element={<AiUsagePage />} />
                    </Route>

                    {/* Admin -- role-gated: only admin (School Admin) may reach these */}
                    <Route element={<RoleRoute allow={["admin"]} />}>
                      <Route path="/admin/dashboard" element={<AdminDashboard />} />
                      <Route path="/admin/teachers" element={<TeachersPage />} />
                      <Route path="/admin/students" element={<StudentsPage />} />
                      <Route path="/admin/parents" element={<ParentsPage />} />
                      <Route path="/admin/announcements" element={<AdminAnnouncementsPage />} />
                      <Route path="/admin/challenges" element={<AdminChallengesPage />} />
                      <Route path="/admin/academic-calendar" element={<AdminAcademicCalendarPage />} />
                      <Route path="/admin/settings" element={<AdminSettingsPage />} />
                      <Route path="/admin/activity-log" element={<AdminActivityLogPage />} />
                      <Route path="/admin/data-requests" element={<DataRequestsPage />} />
                      <Route path="/admin/complaints" element={<ComplaintsPage />} />
                    </Route>

                    {/* Teacher -- role-gated: only teacher may reach these */}
                    <Route element={<RoleRoute allow={["teacher"]} />}>
                      <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
                      <Route path="/teacher/courses" element={<MyCoursesPage />} />
                      <Route path="/teacher/courses/create" element={<CourseBuilderPage />} />
                      <Route path="/teacher/courses/:courseId/edit" element={<CourseBuilderPage />} />
                      <Route path="/teacher/courses/:courseId" element={<CourseDetailsPage />} />
                      <Route path="/teacher/ai-course-builder" element={<AICourseBuilderPage />} />
                      <Route path="/teacher/assignments" element={<AssignmentsPage />} />
                      <Route path="/teacher/assignments/:assignmentId/submissions" element={<AssignmentSubmissionsPage />} />
                      <Route path="/teacher/assignments/:assignmentId/submissions/:submissionId" element={<GradeSubmissionPage />} />
                      <Route path="/teacher/students" element={<StudentReportsPage />} />
                      <Route path="/teacher/analytics" element={<AnalyticsPage />} />
                      <Route path="/teacher/announcements" element={<TeacherAnnouncementsPage />} />
                      <Route path="/teacher/discussions" element={<TeacherDiscussionsPage />} />
                      <Route path="/teacher/academic-calendar" element={<TeacherAcademicCalendarPage />} />
                      <Route path="/teacher/reports" element={<Navigate to="/teacher/students" replace />} />
                      <Route path="/teacher/challenges" element={<TeacherChallengesPage />} />
                      <Route path="/teacher/games" element={<ManageGamesPage />} />
                      <Route path="/teacher/messages" element={<TeacherMessagesPage />} />
                      <Route path="/teacher/attendance" element={<TeacherAttendancePage />} />
                      <Route path="/teacher/rubrics" element={<TeacherRubricsPage />} />
                      <Route path="/teacher/settings" element={<TeacherSettingsPage />} />
                    </Route>

                    {/* Student -- role-gated: only student may reach these */}
                    <Route element={<RoleRoute allow={["student"]} />}>
                      <Route path="/student/dashboard" element={<StudentDashboard />} />
                      <Route path="/student/courses" element={<StudentMyCoursesPage />} />
                      <Route path="/student/courses/:courseId/learn" element={<CoursePlayerPage />} />
                      <Route path="/student/ai-tutor" element={<AITutorPage />} />
                      <Route path="/student/assignments" element={<StudentAssignmentsPage />} />
                      <Route path="/student/practice" element={<Navigate to="/student/assignments" replace />} />
                      <Route path="/student/rewards" element={<StudentRewardsPage />} />
                      <Route path="/student/profile" element={<StudentProfilePage />} />
                      <Route path="/student/announcements" element={<StudentAnnouncementsPage />} />
                      <Route path="/student/discussions" element={<StudentDiscussionsPage />} />
                      <Route path="/student/academic-calendar" element={<StudentAcademicCalendarPage />} />
                      <Route path="/student/challenges" element={<StudentChallengesPage />} />
                      <Route path="/student/fun-games" element={<FunGamesPage />} />
                      <Route path="/student/messages" element={<StudentMessagesPage />} />
                      <Route path="/student/attendance" element={<StudentAttendancePage />} />
                    </Route>

                    {/* Parent -- role-gated: only parent (Guardian) may reach these; read-only views of linked children */}
                    <Route element={<RoleRoute allow={["parent"]} />}>
                      <Route path="/parent/dashboard" element={<ParentDashboardPage />} />
                      <Route path="/parent/children/:studentId" element={<ParentChildDetailPage />} />
                      <Route path="/parent/announcements" element={<ParentAnnouncementsPage />} />
                      <Route path="/parent/academic-calendar" element={<ParentAcademicCalendarPage />} />
                      <Route path="/parent/messages" element={<ParentMessagesPage />} />
                      <Route path="/parent/attendance" element={<ParentAttendancePage />} />
                    </Route>
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