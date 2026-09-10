import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { generateId } from "../utils/generateId";
import { schoolService } from "../services/schoolService";
import { superAdminAPI } from "../services/api";

const SchoolContext = createContext(null);

// Maps a raw (camelCase) subscription record from GET/PUT /super-admin/subscriptions
// into the shape the Super Admin subscription UI expects. Fields the backend
// Subscription model does not store (renewalDate, studentLimit, teacherLimit)
// are intentionally left undefined rather than fabricated.
function mapSubscription(s) {
  return {
    id: s.id,
    schoolId: s.schoolId,
    schoolName: s.schoolName,
    plan: s.plan,
    status: s.status,
    startedDate: s.startDate ? String(s.startDate).slice(0, 10) : undefined,
    expiryDate: s.endDate ? String(s.endDate).slice(0, 10) : undefined,
  };
}

export function SchoolProvider({ children }) {
  const [schools, setSchools] = useState([]);
  // True until the initial GET /super-admin/schools resolves (or there's no
  // token to fetch with). A page keyed by school id -- e.g. SchoolDetailsPage
  // -- must wait for this before concluding "school not found", otherwise a
  // hard refresh/direct link always bounces a real school back to the list
  // because `schools` is still its initial empty array on first render.
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [schoolAdmins, setSchoolAdmins] = useState([]);

  // Sync state with FastAPI backend based on authenticated user role
  useEffect(() => {
    const token = localStorage.getItem("token") || localStorage.getItem("ails_token");
    if (!token) {
      setSchoolsLoading(false);
      return;
    }

    let userRole = "";
    try {
      const storedUser = localStorage.getItem("ails_auth_user") || localStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        userRole = (parsed.role || "").toLowerCase();
      }
    } catch {}

    // Only super_admin is authorized to call superAdminAPI endpoints
    if (userRole === "super_admin" || userRole === "superadmin") {
      superAdminAPI.getSchools().then((res) => {
        if (res.data && Array.isArray(res.data)) {
          const fetched = res.data.map((s) => ({
            id: s.id,
            schoolName: s.name || s.schoolName,
            domain: s.domain,
            status: s.isActive ? "active" : "suspended",
            createdDate: s.createdAt ? s.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
            studentCount: s.student_count || s.studentCount || 0,
            teacherCount: s.teacher_count || s.teacherCount || 0,
            courseCount: s.course_count || s.courseCount || 0,
            adminName: s.admin_name || s.adminName || s.admin_user?.full_name || "School Admin",
            adminEmail: s.admin_email || s.adminEmail || s.admin_user?.email || `admin@${s.domain || "school.edu"}`,
            adminId: s.admin_id || s.adminId || s.admin_user?.id,
            adminUser: s.admin_user || s.adminUser,
            aiProvider: s.ai_provider || s.aiProvider || "gemini",
            subscriptionPlan: s.subscription_plan || s.subscriptionPlan || "Professional",
            monthlyActiveUsers: (s.student_count || s.studentCount || 0) + (s.teacher_count || s.teacherCount || 0),
            aiUsageCount: 0,
          }));
          setSchools(fetched);
        }
        setSchoolsLoading(false);
      }).catch(() => {
        setSchoolsLoading(false);
      });

      superAdminAPI.getSubscriptions().then((res) => {
        if (res.data && Array.isArray(res.data)) {
          setSubscriptions(res.data.map(mapSubscription));
        }
      }).catch(() => {});
    } else {
      // Non-super-admin roles never call getSchools -- nothing to wait for.
      setSchoolsLoading(false);
    }
  }, []);

  function logActivity(schoolId, type, message) {
    setActivityLogs((prev) => [
      { id: generateId(), schoolId, type, message, timestamp: new Date().toISOString() },
      ...prev,
    ]);
  }

  async function addSchool(formData) {
    const { school, admin } = await schoolService.createSchool(formData);

    setSchools((prev) => [school, ...prev]);
    setSchoolAdmins((prev) => [...prev, admin]);

    // The backend creates the real Subscription row as part of school creation;
    // re-fetch the authoritative list rather than fabricating one locally.
    try {
      const subsRes = await superAdminAPI.getSubscriptions();
      if (subsRes.data && Array.isArray(subsRes.data)) {
        setSubscriptions(subsRes.data.map(mapSubscription));
      }
    } catch {}

    logActivity(school.id, "school_created", `${school.schoolName} was onboarded to the platform.`);

    return { school, admin };
  }

  async function updateSchool(id, data) {
    await schoolService.updateSchool(id, data);
    setSchools((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
    logActivity(id, "school_updated", `School information was updated.`);
  }

  async function suspendSchool(id) {
    await schoolService.suspendSchool(id);
    setSchools((prev) => prev.map((s) => (s.id === id ? { ...s, status: "suspended" } : s)));
    const school = schools.find((s) => s.id === id);
    logActivity(id, "school_suspended", `${school?.schoolName || "A school"} was suspended.`);
  }

  async function activateSchool(id) {
    await schoolService.activateSchool(id);
    setSchools((prev) => prev.map((s) => (s.id === id ? { ...s, status: "active" } : s)));
    const school = schools.find((s) => s.id === id);
    logActivity(id, "school_activated", `${school?.schoolName || "A school"} was activated.`);
  }

  async function deleteSchool(id) {
    await schoolService.deleteSchool(id);
    const school = schools.find((s) => s.id === id);
    setSchools((prev) => prev.filter((s) => s.id !== id));
    setSubscriptions((prev) => prev.filter((s) => s.schoolId !== id));
    setSchoolAdmins((prev) => prev.filter((a) => a.schoolId !== id));
    logActivity(null, "school_deleted", `${school?.schoolName || "A school"} was removed from the platform.`);
  }

  function getSchoolById(id) {
    return schools.find((s) => s.id === id) || null;
  }

  function getSubscriptionBySchool(schoolId) {
    return subscriptions.find((s) => s.schoolId === schoolId) || null;
  }

  async function updateSubscription(schoolId, data) {
    const payload = {};
    if (data.plan !== undefined) payload.plan = data.plan;
    if (data.status !== undefined) payload.status = data.status;
    if (data.endDate !== undefined) payload.end_date = data.endDate;

    const res = await superAdminAPI.updateSubscription(schoolId, payload);
    const updated = mapSubscription(res.data);
    setSubscriptions((prev) => prev.map((s) => (s.schoolId === schoolId ? updated : s)));
    logActivity(schoolId, "subscription_changed", `Subscription plan updated to ${updated.plan || "a new plan"}.`);
    return updated;
  }

  const platformStats = useMemo(() => {
    const totalSchools = schools.length;
    const activeSchools = schools.filter((s) => s.status === "active").length;
    const inactiveSchools = totalSchools - activeSchools;
    const totalTeachers = schools.reduce((sum, s) => sum + (s.teacherCount || 0), 0);
    const totalStudents = schools.reduce((sum, s) => sum + (s.studentCount || 0), 0);
    const totalCourses = schools.reduce((sum, s) => sum + (s.courseCount || 0), 0);
    const monthlyActiveUsers = schools.reduce((sum, s) => sum + (s.monthlyActiveUsers || 0), 0);
    const aiUsageCount = schools.reduce((sum, s) => sum + (s.aiUsageCount || 0), 0);

    const planCounts = {};
    schools.forEach((s) => {
      const plan = s.subscriptionPlan || "Professional";
      planCounts[plan] = (planCounts[plan] || 0) + 1;
    });
    const subscriptionDistribution = Object.entries(planCounts).map(([name, value]) => ({ name, value }));

    return {
      totalSchools, activeSchools, inactiveSchools, totalTeachers,
      totalStudents, totalCourses, monthlyActiveUsers, aiUsageCount,
      subscriptionDistribution,
    };
  }, [schools]);

  return (
    <SchoolContext.Provider
      value={{
        schools, schoolsLoading, subscriptions, activityLogs, platformStats,
        addSchool, updateSchool, suspendSchool, activateSchool, deleteSchool,
        getSchoolById, getSubscriptionBySchool, updateSubscription,
      }}
    >
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchools() {
  const ctx = useContext(SchoolContext);
  if (!ctx) throw new Error("useSchools must be used within SchoolProvider");
  return ctx;
}