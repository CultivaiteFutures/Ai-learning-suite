/**
 * Mock AI description generator.
 * TODO: Replace with a real call to a backend endpoint, e.g.
 *   POST /api/v1/ai/generate-course-description
 * which proxies securely to the Claude API (never call Claude directly
 * from the frontend — the API key must stay server-side).
 */
export async function generateCourseDescription({ name, subject, grade }) {
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const courseName = name?.trim() || "This course";
  const subjectLabel = subject || "this subject";
  const gradeLabel = grade || "students";

  return `This ${subjectLabel} course, "${courseName}", is designed for ${gradeLabel} to build a strong foundation in core concepts through interactive lessons, real-world examples, and hands-on practice. Students will develop critical thinking and problem-solving skills while progressing through structured units, quizzes, and AI-guided practice sessions tailored to their pace.`;
}