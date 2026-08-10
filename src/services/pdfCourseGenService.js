import { generateId } from "../utils/generateId";

/**
 * MOCK PDF-to-Course generator.
 * TODO (Backend integration): replace with a call to a FastAPI endpoint, e.g.
 *   POST /api/v1/ai/generate-course-from-pdf (multipart upload)
 * which extracts text server-side (e.g. via a PDF parser) and proxies the
 * extracted content to the Claude API to produce the course structure.
 * The PDF file itself must never be sent directly to Claude from the browser.
 */

const MODULE_LIBRARY = [
  { name: "Introduction & Key Concepts", description: "Extracted from the uploaded document, covering foundational terminology and ideas." },
  { name: "Core Content Deep Dive", description: "The main body of content extracted from the document, structured into a teachable module." },
  { name: "Applied Practice", description: "Practice-oriented content derived from examples and exercises found in the document." },
];

function buildLesson(index, fileName, ctx) {
  return {
    id: generateId(),
    title: `Lesson ${index + 1}: Extracted Section ${index + 1}`,
    description: `Content extracted from "${fileName}" for ${ctx.subject} (${ctx.grade}).`,
    objectives: [`Understand the key concept from section ${index + 1} of the source document`],
    content: `This lesson's content was extracted from the uploaded PDF "${fileName}". Review the original document for full detail, and edit this section to refine the explanation for your students.`,
    activity: `Guided activity based on section ${index + 1} of "${fileName}".`,
    quiz: `A short comprehension quiz covering the material from this section.`,
    resources: [fileName],
    pdfAttachment: { name: fileName },
    videoUrl: "",
  };
}

function buildModule(index, fileName, ctx) {
  const template = MODULE_LIBRARY[index % MODULE_LIBRARY.length];
  const lessons = [buildLesson(index * 2, fileName, ctx), buildLesson(index * 2 + 1, fileName, ctx)];
  return { id: generateId(), name: `Module ${index + 1}: ${template.name}`, description: template.description, lessons };
}

export async function generateCourseFromPDF(fileName, ctx) {
  await new Promise((resolve) => setTimeout(resolve, 2200));

  const numberOfModules = 3;
  const modules = Array.from({ length: numberOfModules }, (_, i) => buildModule(i, fileName, ctx));

  return {
    courseName: fileName.replace(/\.pdf$/i, "").replace(/[-_]/g, " "),
    overview: `This course was generated from the uploaded document "${fileName}". AI extracted the text and structured it into ${numberOfModules} modules covering the document's main sections. Review and edit each module and lesson before publishing.`,
    modules,
  };
}