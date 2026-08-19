import { aiAPI } from "./api";
import { generateId } from "../utils/generateId";

export async function generateCourseFromPDF(fileOrName, ctx = {}) {
  try {
    let file = fileOrName;
    if (!(fileOrName instanceof File)) {
      // If mock string name was passed in fallback
      file = new File(["dummy pdf content"], typeof fileOrName === 'string' ? fileOrName : "document.pdf", { type: "application/pdf" });
    }

    const res = await aiAPI.generateCourseFromPDF(file);
    const data = res.data;

    const modules = (data.modules || []).map((m, mIdx) => ({
      id: generateId(),
      name: m.title || m.name || `Module ${mIdx + 1}`,
      description: m.description || "Extracted from document.",
      lessons: (m.lessons || []).map((l, lIdx) => ({
        id: generateId(),
        title: l.title || l.name || `Lesson ${lIdx + 1}`,
        description: l.summary || l.content?.slice(0, 100) || "",
        objectives: [`Understand section ${lIdx + 1} of source document`],
        content: l.content || "Content extracted from document.",
        activity: Array.isArray(l.activities) ? l.activities.join("\n") : (l.activities || "Document review activity."),
        quiz: Array.isArray(l.quiz) ? JSON.stringify(l.quiz) : (l.quiz || "Short quiz."),
        resources: [file.name],
        pdfAttachment: { name: file.name },
        videoUrl: ""
      }))
    }));

    return {
      courseName: data.title || file.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " "),
      overview: data.description || `Course generated from uploaded document "${file.name}".`,
      modules
    };
  } catch (err) {
    const errorMsg = err.response?.data?.detail || err.message || "AI configuration required: Anthropic Claude API key is not configured.";
    console.error("PDF Course Generation error:", errorMsg);
    throw new Error(errorMsg);
  }
}