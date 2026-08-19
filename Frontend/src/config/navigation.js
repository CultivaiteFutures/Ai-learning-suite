export const NAVIGATION_CONFIG = {
  super_admin: [
    { label: "Platform Dashboard", path: "/super-admin/dashboard", icon: "LayoutDashboard" },
    { label: "Schools", path: "/super-admin/schools", icon: "Building2" },
    { label: "Subscriptions", path: "/super-admin/subscriptions", icon: "CreditCard" },
    { label: "Platform Settings", path: "/super-admin/platform-settings", icon: "Settings" },
    { label: "Activity Logs", path: "/super-admin/activity", icon: "Activity" },
  ],
  admin: [
    { label: "Dashboard", path: "/admin/dashboard", icon: "LayoutDashboard" },
    { label: "Teachers", path: "/admin/teachers", icon: "Users" },
    { label: "Students", path: "/admin/students", icon: "GraduationCap" },
    { label: "Grades", path: "/admin/grades", icon: "Award" },
    { label: "Reports", path: "/admin/reports", icon: "BarChart3" },
    { label: "Settings", path: "/admin/settings", icon: "Settings" },
  ],
  teacher: [
    { label: "Dashboard", path: "/teacher/dashboard", icon: "LayoutDashboard" },
    { label: "My Courses", path: "/teacher/courses", icon: "BookOpen" },
    { label: "Create Course", path: "/teacher/courses/create", icon: "PlusCircle" },
    { label: "AI Course Builder", path: "/teacher/ai-course-builder", icon: "Sparkles" },
    { label: "Assignments", path: "/teacher/assignments", icon: "ClipboardList" },
    { label: "Students", path: "/teacher/students", icon: "GraduationCap" },
    { label: "Analytics", path: "/teacher/analytics", icon: "BarChart3" },
  ],
  student: [
    { label: "Dashboard", path: "/student/dashboard", icon: "LayoutDashboard" },
    { label: "My Courses", path: "/student/courses", icon: "BookOpen" },
    { label: "AI Tutor", path: "/student/ai-tutor", icon: "Bot" },
    { label: "Practice", path: "/student/practice", icon: "Dumbbell" },
    { label: "Rewards", path: "/student/rewards", icon: "Trophy" },
    { label: "Profile", path: "/student/profile", icon: "User" },
  ],
};

export const ROLE_LABELS = {
  super_admin: "Super Admin",
  admin: "School Admin",
  teacher: "Teacher",
  student: "Student",
};