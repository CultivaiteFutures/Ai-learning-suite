import { aiAPI } from "./api";

/**
 * Real AI course description generator proxying through FastAPI backend
 */
export async function generateCourseDescription({ name, subject, grade }) {
  try {
    const res = await aiAPI.generateCourse({
      course_name: name || "New Course",
      grade: grade || "Grade 10",
      subject: subject || "General",
    });
    return res.data?.description || "";
  } catch (err) {
    const errorMsg = err.response?.data?.detail || "AI configuration required: Anthropic Claude API key is not configured on the server.";
    throw new Error(errorMsg);
  }
}