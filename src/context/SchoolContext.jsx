import { createContext, useContext, useState, useEffect, useMemo } from "react";
import mockSchools from "../data/mockSchools.json";
import mockSubscriptions from "../data/mockSubscriptions.json";
import mockGoldenTemplates from "../data/mockGoldenTemplates.json";
import mockActivityLogs from "../data/mockActivityLogs.json";
import mockSchoolAdmins from "../data/mockSchoolAdmins.json";
import { generateId } from "../utils/generateId";
import { schoolService } from "../services/schoolService";

const SchoolContext = createContext(null);

const SCHOOLS_KEY = "ails_schools";
const SUBSCRIPTIONS_KEY = "ails_subscriptions";
const TEMPLATES_KEY = "ails_golden_templates";
const ACTIVITY_KEY = "ails_activity_logs";
const SCHOOL_ADMINS_KEY = "ails_school_admins"; // shared with mockUsers.js login lookup

function loadInitial(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export function SchoolProvider({ children }) {
  const [schools, setSchools] = useState(() => loadInitial(SCHOOLS_KEY, mockSchools));
  const [subscriptions, setSubscriptions] = useState(() => loadInitial(SUBSCRIPTIONS_KEY, mockSubscriptions));
  const [goldenTemplates, setGoldenTemplates] = useState(() => loadInitial(TEMPLATES_KEY, mockGoldenTemplates));
  const [activityLogs, setActivityLogs] = useState(() => loadInitial(ACTIVITY_KEY, mockActivityLogs));
  const [schoolAdmins, setSchoolAdmins] = useState(() => loadInitial(SCHOOL_ADMINS_KEY, mockSchoolAdmins));

  useEffect(() => localStorage.setItem(SCHOOLS_KEY, JSON.stringify(schools)), [schools]);
  useEffect(() => localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(subscriptions)), [subscriptions]);
  useEffect(() => localStorage.setItem(TEMPLATES_KEY, JSON.stringify(goldenTemplates)), [goldenTemplates]);
  useEffect(() => localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activityLogs)), [activityLogs]);
  useEffect(() => localStorage.setItem(SCHOOL_ADMINS_KEY, JSON.stringify(schoolAdmins)), [schoolAdmins]);

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
    setSubscriptions((prev) => [
      {
        id: generateId(),
        schoolId: school.id,
        plan: school.subscriptionPlan,
        status: "active",
        startedDate: school.createdDate,
        expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10),
        renewalDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10),
        studentLimit: school.studentLimit,
        teacherLimit: school.teacherLimit,
      },
      ...prev,
    ]);
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

  function updateSubscription(schoolId, data) {
    setSubscriptions((prev) => prev.map((s) => (s.schoolId === schoolId ? { ...s, ...data } : s)));
    logActivity(schoolId, "subscription_changed", `Subscription plan updated to ${data.plan || "a new plan"}.`);
  }

  async function adoptGoldenTemplate(templateId, schoolId) {
    const template = goldenTemplates.find((t) => t.id === templateId);
    if (!template) return null;
    const courseCopy = await schoolService.adoptGoldenTemplate(template, schoolId);
    const school = getSchoolById(schoolId);
    logActivity(schoolId, "template_adopted", `${school?.schoolName || "A school"} adopted Golden Source template "${template.name}".`);
    return courseCopy;
  }

  function addGoldenTemplate(data) {
    const template = { id: generateId(), status: "published", createdDate: new Date().toISOString().slice(0, 10), ...data };
    setGoldenTemplates((prev) => [template, ...prev]);
  }

  function updateGoldenTemplate(id, data) {
    setGoldenTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)));
  }

  function deleteGoldenTemplate(id) {
    setGoldenTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  const platformStats = useMemo(() => {
    const totalSchools = schools.length;
    const activeSchools = schools.filter((s) => s.status === "active").length;
    const inactiveSchools = totalSchools - activeSchools;
    const totalTeachers = schools.reduce((sum, s) => sum + s.teacherCount, 0);
    const totalStudents = schools.reduce((sum, s) => sum + s.studentCount, 0);
    const totalCourses = schools.reduce((sum, s) => sum + s.courseCount, 0);
    const monthlyActiveUsers = schools.reduce((sum, s) => sum + s.monthlyActiveUsers, 0);
    const aiUsageCount = schools.reduce((sum, s) => sum + s.aiUsageCount, 0);

    const planCounts = {};
    schools.forEach((s) => {
      planCounts[s.subscriptionPlan] = (planCounts[s.subscriptionPlan] || 0) + 1;
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
        schools, subscriptions, goldenTemplates, activityLogs, platformStats,
        addSchool, updateSchool, suspendSchool, activateSchool, deleteSchool,
        getSchoolById, getSubscriptionBySchool, updateSubscription,
        adoptGoldenTemplate, addGoldenTemplate, updateGoldenTemplate, deleteGoldenTemplate,
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