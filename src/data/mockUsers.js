import mockTeachers from "./mockTeachers.json";
import mockStudents from "./mockStudents.json";
import mockSchoolAdmins from "./mockSchoolAdmins.json";

const SCHOOL_ID = "sch-001";
const SCHOOL_NAME = "AI Learning Suite Demo School";
const SCHOOL_ADMINS_KEY = "ails_school_admins"; // shared with SchoolContext

export const MOCK_PASSWORD = "password123";

const superAdminUsers = [
  {
    id: "super-admin-1",
    name: "Rahul Verma",
    email: "superadmin@ailearningsuite.com",
    role: "super_admin",
    schoolName: null,
  },
];

const adminUsers = [
  {
    id: "admin-1",
    name: "Anjali Deshpande",
    email: "admin@aischool.edu",
    role: "admin",
    schoolId: SCHOOL_ID,
    schoolName: SCHOOL_NAME,
  },
];

const teacherUsers = mockTeachers.map((t) => ({
  id: t.id,
  name: t.name,
  email: t.email,
  role: "teacher",
  schoolId: SCHOOL_ID,
  schoolName: SCHOOL_NAME,
}));

const studentUsers = mockStudents.map((s) => ({
  id: s.id,
  name: s.name,
  email: s.email,
  role: "student",
  schoolId: SCHOOL_ID,
  schoolName: SCHOOL_NAME,
}));

// Static, hand-authored accounts (super admin, primary school's admin, all teachers/students).
export const MOCK_USERS = [...superAdminUsers, ...adminUsers, ...teacherUsers, ...studentUsers];

/**
 * Returns MOCK_USERS plus any School Admin accounts SchoolContext has generated
 * (School onboarding creates a new admin, persisted to localStorage under
 * SCHOOL_ADMINS_KEY — the same key SchoolContext reads/writes).
 */
export function getAllMockUsers() {
  try {
    const stored = localStorage.getItem(SCHOOL_ADMINS_KEY);
    const dynamicAdmins = stored ? JSON.parse(stored) : mockSchoolAdmins;
    return [...MOCK_USERS, ...dynamicAdmins];
  } catch {
    return [...MOCK_USERS, ...mockSchoolAdmins];
  }
}

export const DEMO_CREDENTIALS = [
  { role: "Super Admin", email: superAdminUsers[0].email },
  { role: "School Admin", email: adminUsers[0].email },
  { role: "Teacher", email: teacherUsers[0].email },
  { role: "Student", email: studentUsers[0].email },
];