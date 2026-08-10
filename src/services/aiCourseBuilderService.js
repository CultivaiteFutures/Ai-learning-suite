import { generateId } from "../utils/generateId";

const MODULE_LIBRARY = [
  { name: "Foundations & Core Concepts", description: "Introduces the fundamental ideas, vocabulary, and building blocks students need before going deeper into {subject}." },
  { name: "Building Practical Skills", description: "Moves from theory into hands-on practice with guided exercises that apply {subject} to real situations." },
  { name: "Deeper Exploration", description: "Expands on the core concepts with more challenging problems and connections across topics in {subject}." },
  { name: "Applied Projects", description: "Students apply what they've learned in {subject} to a hands-on project, working individually or in small groups." },
  { name: "Review & Mastery Check", description: "Consolidates learning through structured review, practice assessments, and a mastery checkpoint." },
  { name: "Advanced Topics & Extension", description: "Introduces more advanced or elective topics in {subject} for students ready to go further." },
];

const LESSON_TITLES = [
  "Getting Started: Key Terms & Ideas",
  "Exploring the Core Concept",
  "Guided Practice",
  "Real-World Applications",
  "Problem Solving Workshop",
  "Putting It All Together",
];

function fill(template, ctx) {
  return template.replace(/{subject}/g, ctx.subject);
}

function buildLesson(index, ctx) {
  const title = LESSON_TITLES[index % LESSON_TITLES.length];
  return {
    id: generateId(),
    title: `Lesson ${index + 1}: ${title}`,
    description: `Students engage with ${ctx.subject.toLowerCase()} concepts appropriate for ${ctx.grade}, delivered at a ${ctx.difficulty.toLowerCase()} pace.`,
    objectives: [
      `Understand the key idea behind "${title}"`,
      `Apply this concept through guided practice`,
    ],
    content: `This lesson covers "${title}" as part of ${ctx.subject}. Students will work through core concepts with examples appropriate for ${ctx.grade}, in approximately ${ctx.lessonDuration}.`,
    activity: `Interactive ${ctx.difficulty.toLowerCase()}-level activity: small-group discussion followed by a guided worksheet on today's topic.`,
    quiz: `A short 5-question check-for-understanding quiz covering today's key concept.`,
    resources: [],
    pdfAttachment: null,
    videoUrl: "",
  };
}

function buildModule(index, lessonsCount, ctx) {
  const template = MODULE_LIBRARY[index % MODULE_LIBRARY.length];
  const lessons = Array.from({ length: lessonsCount }, (_, i) => buildLesson(i, ctx));
  return {
    id: generateId(),
    name: `Module ${index + 1}: ${template.name}`,
    description: fill(template.description, ctx),
    lessons,
  };
}

export async function generateCourseWithAI(formData) {
  await new Promise((resolve) => setTimeout(resolve, 1800));

  const ctx = {
    subject: formData.subject,
    grade: formData.grade,
    difficulty: formData.difficulty,
    lessonDuration: formData.lessonDuration,
  };

  const numberOfModules = Math.min(8, Math.max(2, Number(formData.numberOfModules) || 4));
  const lessonsPerModule = 3;
  const modules = Array.from({ length: numberOfModules }, (_, i) => buildModule(i, lessonsPerModule, ctx));

  const objectivesFromInput = (formData.learningObjectives || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const objectives =
    objectivesFromInput.length > 0
      ? objectivesFromInput
      : [
          `Build a solid foundation in core ${formData.subject} concepts for ${formData.grade}`,
          `Develop problem-solving skills through guided and independent practice`,
          `Apply learning to real-world and project-based scenarios`,
        ];

  const prerequisites = [
    `Basic familiarity with ${formData.grade} level coursework`,
    `Comfort reading grade-level texts and following multi-step instructions`,
  ];

  const learningOutcomes = [
    `Explain core ${formData.subject} concepts in their own words`,
    `Apply concepts to solve ${formData.difficulty.toLowerCase()}-level problems independently`,
    `Complete a culminating project demonstrating mastery of the material`,
  ];

  const totalLessons = numberOfModules * lessonsPerModule;
  const estimatedDuration = `${numberOfModules} weeks (approx. ${totalLessons} lessons, ${formData.lessonDuration} each)`;

  return {
    courseName: formData.courseName,
    grade: formData.grade,
    subject: formData.subject,
    language: formData.language,
    difficulty: formData.difficulty,
    overview: `"${formData.courseName}" is a ${formData.difficulty.toLowerCase()}-level ${formData.subject} course designed for ${formData.grade} students. Delivered in ${formData.language}, it blends structured lessons, guided practice, and applied projects to build lasting understanding rather than rote memorization.${
      formData.additionalInstructions ? ` ${formData.additionalInstructions}` : ""
    }`,
    objectives,
    prerequisites,
    learningOutcomes,
    estimatedDuration,
    modules,
  };
}