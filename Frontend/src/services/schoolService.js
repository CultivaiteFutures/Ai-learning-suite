import { superAdminAPI } from "./api";
import { generateId } from "../utils/generateId";
import { generateSchoolCode, generateAdminEmail } from "../utils/generateCredentials";

export const schoolService = {
  async createSchool(schoolData) {
    const adminEmail = (
      schoolData.adminEmail ||
      schoolData.email ||
      generateAdminEmail(generateSchoolCode(schoolData.schoolName || ""))
    ).trim();

    // Only a password the caller actually typed is sent -- when left blank,
    // the backend generates a secure one server-side and returns it below,
    // instead of this client producing the real login credential itself.
    const manualAdminPassword = (schoolData.adminPassword || "").trim();

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
      admin_password: manualAdminPassword || undefined,
      plan: schoolData.subscriptionPlan || "Professional",
      ai_provider: schoolData.aiProvider || "gemini"
    };

    const res = await superAdminAPI.createSchool(payload);
    const created = res.data;
    const adminPassword = manualAdminPassword || created.generatedAdminPassword || "";

    const school = {
      id: created.id,
      schoolName: created.name,
      schoolCode: generateSchoolCode(created.name),
      status: created.isActive ? "active" : "suspended",
      createdDate: new Date().toISOString().slice(0, 10),
      studentCount: created.studentCount || 0,
      teacherCount: created.teacherCount || 0,
      courseCount: created.courseCount || 0,
      subscriptionPlan: created.subscriptionPlan || payload.plan,
      aiProvider: created.aiProvider || payload.ai_provider,
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

};