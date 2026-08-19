import { aiAPI } from "./api";
import { generateId } from "../utils/generateId";

export async function generateCourseWithAI(formData) {
  try {
    const payload = {
      course_name: formData.courseName || "New AI Course",
      grade: formData.grade || "Grade 10",
      subject: formData.subject || "General",
      language: formData.language || "English",
      difficulty: formData.difficulty || "Medium",
      objectives: formData.learningObjectives || "",
      number_of_modules: Number(formData.numberOfModules) || 4,
      lesson_duration: formData.lessonDuration || "30 mins",
      additional_instructions: formData.additionalInstructions || ""
    };

    const res = await aiAPI.generateCourse(payload);
    const data = res.data;

    const modules = (data.modules || []).map((m, mIdx) => ({
      id: generateId(),
      name: m.title || m.name || `Module ${mIdx + 1}`,
      description: m.description || "",
      lessons: (m.lessons || []).map((l, lIdx) => ({
        id: generateId(),
        title: l.title || l.name || `Lesson ${lIdx + 1}`,
        description: l.summary || l.content?.slice(0, 100) || "",
        objectives: [
          `Understand key concepts of ${l.title || "this lesson"}`,
          `Apply knowledge through practice exercises`
        ],
        content: l.content || `Detailed material covering ${l.title}`,
        activity: Array.isArray(l.activities) ? l.activities.join("\n") : (l.activities || "Guided practice worksheet."),
        quiz: Array.isArray(l.quiz) ? JSON.stringify(l.quiz) : (l.quiz || "5-question comprehension check."),
        resources: [],
        pdfAttachment: null,
        videoUrl: ""
      }))
    }));

    return {
      courseName: data.title || formData.courseName,
      grade: data.grade_level || formData.grade,
      subject: data.subject || formData.subject,
      language: data.language || formData.language,
      difficulty: data.difficulty || formData.difficulty,
      overview: data.description || `AI generated course for ${formData.courseName}`,
      objectives: [
        `Build a solid foundation in core ${formData.subject} concepts for ${formData.grade}`,
        `Develop problem-solving skills through guided practice`,
        `Apply learning to real-world scenarios`
      ],
      prerequisites: [
        `Familiarity with ${formData.grade} level coursework`,
        `Comfort reading grade-level texts`
      ],
      learningOutcomes: [
        `Explain core ${formData.subject} concepts in their own words`,
        `Apply concepts to solve problems independently`
      ],
      estimatedDuration: `${modules.length} modules (${modules.reduce((s, m) => s + m.lessons.length, 0)} lessons)`,
      modules
    };
  } catch (err) {
    const errorMsg = err.response?.data?.detail || err.message || "AI configuration required: Anthropic Claude API key is not configured.";
    console.error("AI Course Builder error:", errorMsg);
    throw new Error(errorMsg);
  }
}