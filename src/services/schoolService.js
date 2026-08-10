/**
 * MOCK SCHOOL SERVICE — frontend-only, no backend yet.
 *
 * TODO (Backend integration): once FastAPI is ready, these functions call
 * real endpoints instead, e.g.:
 *   POST   /api/v1/schools              -> createSchool
 *   PATCH  /api/v1/schools/{id}          -> updateSchool
 *   PATCH  /api/v1/schools/{id}/suspend  -> suspendSchool
 *   PATCH  /api/v1/schools/{id}/activate -> activateSchool
 *   DELETE /api/v1/schools/{id}          -> deleteSchool
 *   POST   /api/v1/schools/{id}/adopt-template/{templateId} -> adoptGoldenTemplate
 *
 * Return shapes below are what SchoolContext expects, and should stay
 * identical once real API calls replace the mock bodies.
 */

import { generateId } from "../utils/generateId";
import { generateSchoolCode, generateTempPassword, generateAdminEmail } from "../utils/generateCredentials";

const MOCK_DELAY_MS = 400;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const schoolService = {
  async createSchool(schoolData) {
    await delay(MOCK_DELAY_MS);

    const schoolCode = generateSchoolCode(schoolData.schoolName);

    const school = {
      id: generateId(),
      schoolCode,
      status: "active",
      createdDate: new Date().toISOString().slice(0, 10),
      studentCount: 0,
      teacherCount: 0,
      courseCount: 0,
      monthlyActiveUsers: 0,
      aiUsageCount: 0,
      ...schoolData,
    };

    const tempPassword = generateTempPassword();
    const admin = {
      id: generateId(),
      name: `${schoolData.principalName || "School"} Admin`,
      email: generateAdminEmail(schoolCode),
      role: "admin",
      schoolId: school.id,
      schoolName: school.schoolName,
      tempPassword,
    };

    return { school, admin, tempPassword };
  },

  async updateSchool(id, data) {
    await delay(MOCK_DELAY_MS);
    return { id, ...data };
  },

  async suspendSchool(id) {
    await delay(300);
    return { id, status: "suspended" };
  },

  async activateSchool(id) {
    await delay(300);
    return { id, status: "active" };
  },

  async deleteSchool(id) {
    await delay(300);
    return { id, deleted: true };
  },

  async adoptGoldenTemplate(template, schoolId) {
    await delay(500);
    // Returns a school-owned COPY — never mutates or references the Golden Source.
    return {
      id: generateId(),
      name: template.name,
      subject: template.subject,
      grade: template.grade,
      description: template.description,
      status: "draft",
      lessonsCount: template.lessonsCount,
      originTemplateId: template.id,
      schoolId,
      createdDate: new Date().toISOString().slice(0, 10),
      updatedDate: new Date().toISOString().slice(0, 10),
    };
  },
};