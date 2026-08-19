import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { generateId } from "../utils/generateId";
import { schoolService } from "../services/schoolService";
import { superAdminAPI } from "../services/api";

const SchoolContext = createContext(null);

export function SchoolProvider({ children }) {
  const [schools, setSchools] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [goldenTemplates, setGoldenTemplates] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [schoolAdmins, setSchoolAdmins] = useState([]);

  // Sync state exclusively with FastAPI backend whenever token is active
  useEffect(() => {
    const token = localStorage.getItem("token") || localStorage.getItem("ails_token");
    if (!token) return;

    superAdminAPI.getSchools().then((res) => {
      if (res.data && Array.isArray(res.data)) {
        const fetched = res.data.map((s) => ({
          id: s.id,
          schoolName: s.name || s.schoolName,
          domain: s.domain,
          status: s.is_active ? "active" : "suspended",
          createdDate: s.created_at ? s.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
          studentCount: s.student_count || s.studentCount || 0,
          teacherCount: s.teacher_count || s.teacherCount || 0,
          courseCount: s.course_count || s.courseCount || 0,
          subscriptionPlan: s.subscription_plan || s.subscriptionPlan || "Professional",
          monthlyActiveUsers: (s.student_count || 0) + (s.teacher_count || 0),
          aiUsageCount: 0,
        }));
        setSchools(fetched);
      }
    }).catch(() => {});

    superAdminAPI.getGoldenTemplates().then((res) => {
      if (res.data && Array.isArray(res.data)) {
        const fetchedT = res.data.map((t) => ({
          id: t.id,
          name: t.title || t.name,
          subject: t.subject,
          grade: t.grade_level || t.grade,
          description: t.description,
          status: t.is_published ? "published" : "draft",
          modulesCount: (t.modules || []).length,
          lessonsCount: (t.modules || []).reduce((sum, m) => sum + (m.lessons?.length || 0), 0),
          modules: t.modules || [],
        }));
        setGoldenTemplates(fetchedT);
      }
    }).catch(() => {});
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

  async function addGoldenTemplate(data) {
    try {
      const payload = {
        title: data.name || data.title,
        description: data.description || "",
        subject: data.subject || "General",
        grade_level: data.grade || data.grade_level || "Grade 10",
        language: data.language || "English",
        difficulty: data.difficulty || "Medium",
        modules: data.modules || []
      };

      const res = await superAdminAPI.createGoldenTemplate(payload);
      const created = res.data;
      const templateItem = {
        id: created.id,
        name: created.title || created.name,
        subject: created.subject,
        grade: created.grade_level || created.grade,
        description: created.description,
        status: created.is_published ? "published" : "draft",
        modules: created.modules || [],
        modulesCount: (created.modules || []).length,
        lessonsCount: (created.modules || []).reduce((sum, m) => sum + (m.lessons?.length || 0), 0),
        createdDate: created.created_at ? created.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
      };
      setGoldenTemplates((prev) => [templateItem, ...prev.filter((t) => t.id !== created.id)]);
      return templateItem;
    } catch (err) {
      console.error("Error creating golden template:", err);
      const template = {
        id: generateId(),
        status: "published",
        createdDate: new Date().toISOString().slice(0, 10),
        modulesCount: Number(data.modulesCount) || 4,
        lessonsCount: Number(data.lessonsCount) || 12,
        ...data
      };
      setGoldenTemplates((prev) => [template, ...prev]);
      return template;
    }
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