export const NAVIGATION_CONFIG = {
  super_admin: [
    { label: "Platform Dashboard", path: "/super-admin/dashboard", icon: "LayoutDashboard" },
    { label: "Schools", path: "/super-admin/schools", icon: "Building2" },
    { label: "Subscriptions", path: "/super-admin/subscriptions", icon: "CreditCard" },
    { label: "Platform Settings", path: "/super-admin/platform-settings", icon: "Settings" },
    { label: "Activity Logs", path: "/super-admin/activity", icon: "Activity" },
    { label: "Complaints", path: "/super-admin/complaints", icon: "MessageSquareWarning" },
    { label: "AI Usage & Cost", path: "/super-admin/ai-usage", icon: "Sparkles" },
  ],
  admin: [
    { label: "Dashboard", path: "/admin/dashboard", icon: "LayoutDashboard" },
    { label: "Teachers", path: "/admin/teachers", icon: "Users" },
    { label: "Students", path: "/admin/students", icon: "GraduationCap" },
    { label: "Parents", path: "/admin/parents", icon: "Users" },
    { label: "Announcements", path: "/admin/announcements", icon: "Megaphone" },
    { label: "Challenges", path: "/admin/challenges", icon: "Swords" },
    { label: "Academic Calendar", path: "/admin/academic-calendar", icon: "CalendarDays" },
    { label: "Activity Log", path: "/admin/activity-log", icon: "Activity" },
    { label: "Data Requests", path: "/admin/data-requests", icon: "ShieldAlert" },
    { label: "Complaints", path: "/admin/complaints", icon: "MessageSquareWarning" },
    { label: "Settings", path: "/admin/settings", icon: "Settings" },
  ],
  teacher: [
    { label: "Dashboard", path: "/teacher/dashboard", icon: "LayoutDashboard" },
    { label: "My Courses", path: "/teacher/courses", icon: "BookOpen" },
    { label: "Create Course", path: "/teacher/courses/create", icon: "PlusCircle" },
    { label: "AI Course Builder", path: "/teacher/ai-course-builder", icon: "Sparkles" },
    { label: "Assignments", path: "/teacher/assignments", icon: "ClipboardList" },
    { label: "Student Reports", path: "/teacher/students", icon: "GraduationCap" },
    { label: "Analytics", path: "/teacher/analytics", icon: "BarChart3" },
    { label: "Announcements", path: "/teacher/announcements", icon: "Megaphone" },
    { label: "Discussions", path: "/teacher/discussions", icon: "MessageSquare" },
    { label: "Academic Calendar", path: "/teacher/academic-calendar", icon: "CalendarDays" },
    { label: "Challenges", path: "/teacher/challenges", icon: "Swords" },
    { label: "Fun Games", path: "/teacher/games", icon: "Puzzle" },
    { label: "Messages", path: "/teacher/messages", icon: "Mail" },
    { label: "Attendance", path: "/teacher/attendance", icon: "CalendarCheck" },
    { label: "Rubrics", path: "/teacher/rubrics", icon: "ListChecks" },
  ],
  student: [
    { label: "Dashboard", path: "/student/dashboard", icon: "LayoutDashboard" },
    { label: "My Courses", path: "/student/courses", icon: "BookOpen" },
    { label: "AI Tutor", path: "/student/ai-tutor", icon: "Bot" },
    { label: "Assignments", path: "/student/assignments", icon: "ClipboardList" },
    { label: "Rewards", path: "/student/rewards", icon: "Trophy" },
    { label: "Profile", path: "/student/profile", icon: "User" },
    { label: "Announcements", path: "/student/announcements", icon: "Megaphone" },
    { label: "Discussions", path: "/student/discussions", icon: "MessageSquare" },
    { label: "Academic Calendar", path: "/student/academic-calendar", icon: "CalendarDays" },
    { label: "Challenges", path: "/student/challenges", icon: "Swords" },
    { label: "Fun Games", path: "/student/fun-games", icon: "Gamepad2" },
    { label: "Messages", path: "/student/messages", icon: "Mail" },
    { label: "Attendance", path: "/student/attendance", icon: "CalendarCheck" },
  ],
  parent: [
    { label: "My Children", path: "/parent/dashboard", icon: "Users" },
    { label: "Announcements", path: "/parent/announcements", icon: "Megaphone" },
    { label: "Academic Calendar", path: "/parent/academic-calendar", icon: "CalendarDays" },
    { label: "Messages", path: "/parent/messages", icon: "Mail" },
    { label: "Attendance", path: "/parent/attendance", icon: "CalendarCheck" },
  ],
};

export const ROLE_LABELS = {
  super_admin: "Super Admin",
  admin: "School Admin",
  teacher: "Teacher",
  student: "Student",
  parent: "Parent",
};

// Where each role lands after login (password or SSO) and the redirect
// target when RoleRoute blocks a role from a section it can't access.
// Single source of truth -- previously duplicated across RoleRoute.jsx,
// LoginPage.jsx, and SsoCallbackPage.jsx.
export const ROLE_HOME = {
  super_admin: "/super-admin/dashboard",
  admin: "/admin/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
  parent: "/parent/dashboard",
};