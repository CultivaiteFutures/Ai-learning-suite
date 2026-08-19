import { superAdminAPI, teacherAPI } from "./api";
import { generateId } from "../utils/generateId";
import { generateSchoolCode, generateTempPassword, generateAdminEmail } from "../utils/generateCredentials";

export const schoolService = {
  async createSchool(schoolData) {
    const adminEmail = (
      schoolData.adminEmail ||
      schoolData.email ||
      generateAdminEmail(generateSchoolCode(schoolData.schoolName || ""))
    ).trim();

    const adminPassword = (
      schoolData.adminPassword ||
      generateTempPassword()
    ).trim();

    const adminName = (
      schoolData.adminName ||
      schoolData.principalName ||
      `${schoolData.schoolName || "School"} Admin`
    ).trim();

    const payload = {
      name: schoolData.schoolName || schoolData.name,
      domain: schoolData.domain || `${(schoolData.schoolName || "").toLowerCase().replace(/[^a-z0-9]/g, "")}.edu`,
      admin_email: adminEmail,
      admin_name: adminName,
      admin_password: adminPassword,
      plan: schoolData.subscriptionPlan || "Professional",
      ai_provider: schoolData.aiProvider || "gemini"
    };

    const res = await superAdminAPI.createSchool(payload);
    const created = res.data;

    const school = {
      id: created.id,
      schoolName: created.name,
      schoolCode: generateSchoolCode(created.name),
      status: created.is_active ? "active" : "suspended",
      createdDate: new Date().toISOString().slice(0, 10),
      studentCount: created.student_count || 0,
      teacherCount: created.teacher_count || 0,
      courseCount: created.course_count || 0,
      subscriptionPlan: created.subscription_plan || payload.plan,
      aiProvider: created.ai_provider || payload.ai_provider,
      monthlyActiveUsers: 0,
      aiUsageCount: 0,
      ...schoolData,
    };

    const admin = {
      id: generateId(),
      name: adminName,
      email: adminEmail,
      role: "admin",
      schoolId: school.id,
      schoolName: school.schoolName,
      tempPassword: adminPassword,
    };

    return { school, admin, tempPassword: adminPassword };
  },

  async updateSchool(id, data) {
    const payload = {
      name: data.schoolName || data.name,
      domain: data.domain,
      ai_provider: data.aiProvider || data.ai_provider,
      admin_email: data.adminEmail || data.email,
      admin_name: data.adminName || data.principalName,
      admin_password: data.adminPassword ? data.adminPassword.trim() : undefined,
      plan: data.subscriptionPlan,
    };
    await superAdminAPI.updateSchool(id, payload);
    return { id, ...data };
  },

  async suspendSchool(id) {
    await superAdminAPI.suspendSchool(id);
    return { id, status: "suspended" };
  },

  async activateSchool(id) {
    await superAdminAPI.activateSchool(id);
    return { id, status: "active" };
  },

  async deleteSchool(id) {
    await superAdminAPI.deleteSchool(id);
    return { id, deleted: true };
  },

  async adoptGoldenTemplate(template, schoolId) {
    const res = await teacherAPI.adoptGoldenTemplate(template.id);
    const cloned = res.data;
    return {
      id: cloned.id,
      name: cloned.title || cloned.name,
      subject: cloned.subject,
      grade: cloned.grade_level || cloned.grade,
      description: cloned.description,
      status: "draft",
      lessonsCount: (cloned.modules || []).reduce((sum, m) => sum + (m.lessons?.length || 0), 0),
      originTemplateId: template.id,
      schoolId,
      createdDate: new Date().toISOString().slice(0, 10),
      updatedDate: new Date().toISOString().slice(0, 10),
    };
  },
};