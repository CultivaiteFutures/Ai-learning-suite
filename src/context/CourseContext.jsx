import { createContext, useContext, useState, useEffect } from "react";
import mockCourses from "../data/mockCourses.json";
import mockAssignments from "../data/mockAssignments.json";
import { generateId } from "../utils/generateId";
import { useSchools } from "./SchoolContext";

const CourseContext = createContext(null);

const COURSES_KEY = "ails_courses";
const ASSIGNMENTS_KEY = "ails_assignments";

function loadInitial(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function recomputeLessonsCount(modules) {
  return (modules || []).reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
}

export function CourseProvider({ children }) {
  const [courses, setCourses] = useState(() => loadInitial(COURSES_KEY, mockCourses));
  const [assignments, setAssignments] = useState(() => loadInitial(ASSIGNMENTS_KEY, mockAssignments));
  const { goldenTemplates } = useSchools();

  useEffect(() => {
    localStorage.setItem(COURSES_KEY, JSON.stringify(courses));
  }, [courses]);

  useEffect(() => {
    localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
  }, [assignments]);

  function addCourse(data) {
    const { modules: incomingModules, ...rest } = data;
    const modules = incomingModules || [];
    const newCourse = {
      id: generateId(),
      studentsEnrolled: 0,
      createdDate: new Date().toISOString().slice(0, 10),
      updatedDate: new Date().toISOString().slice(0, 10),
      ...rest,
      modules,
      lessonsCount: recomputeLessonsCount(modules),
    };
    setCourses((prev) => [newCourse, ...prev]);
    return newCourse;
  }

  function updateCourse(id, data) {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const merged = { ...c, ...data, updatedDate: new Date().toISOString().slice(0, 10) };
        if (data.modules) merged.lessonsCount = recomputeLessonsCount(data.modules);
        return merged;
      })
    );
  }

  function deleteCourse(id) {
    setCourses((prev) => prev.filter((c) => c.id !== id));
    setAssignments((prev) => prev.filter((a) => a.courseId !== id));
  }

  function getCourseById(id) {
    return courses.find((c) => c.id === id) || null;
  }

  function publishCourse(id) {
    updateCourse(id, { status: "published" });
  }

  function addModule(courseId) {
    const course = getCourseById(courseId);
    if (!course) return;
    const modules = [
      ...(course.modules || []),
      { id: generateId(), name: `Module ${(course.modules?.length || 0) + 1}`, description: "", lessons: [] },
    ];
    updateCourse(courseId, { modules });
  }

  function updateModule(courseId, moduleId, data) {
    const course = getCourseById(courseId);
    if (!course) return;
    const modules = (course.modules || []).map((m) => (m.id === moduleId ? { ...m, ...data } : m));
    updateCourse(courseId, { modules });
  }

  function deleteModule(courseId, moduleId) {
    const course = getCourseById(courseId);
    if (!course) return;
    const modules = (course.modules || []).filter((m) => m.id !== moduleId);
    updateCourse(courseId, { modules });
  }

  function reorderModule(courseId, moduleId, direction) {
    const course = getCourseById(courseId);
    if (!course) return;
    const modules = [...(course.modules || [])];
    const index = modules.findIndex((m) => m.id === moduleId);
    if (index === -1) return;
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= modules.length) return;
    [modules[index], modules[swapWith]] = [modules[swapWith], modules[index]];
    updateCourse(courseId, { modules });
  }

  function addAssignment(data) {
    const newAssignment = { id: generateId(), submissionsCount: 0, status: "open", ...data };
    setAssignments((prev) => [newAssignment, ...prev]);
    return newAssignment;
  }

  function updateAssignment(id, data) {
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
  }

  function deleteAssignment(id) {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  }

  function getAssignmentsByCourse(courseId) {
    return assignments.filter((a) => a.courseId === courseId);
  }

  /**
   * Golden Source -> Copy Template -> Assign school_id -> Assign teacher -> Save.
   * Deep-clones a published Golden Source template into a brand-new,
   * school-owned Course. The original template is never mutated.
   */
  function importTemplate(templateId, teacherId, schoolId, teacherName) {
    const template = goldenTemplates.find((t) => t.id === templateId);
    if (!template) return null;

    const clonedModules = (template.modules || []).map((m) => ({
      id: generateId(),
      name: m.name,
      description: m.description,
      lessons: (m.lessons || []).map((l) => ({
        id: generateId(),
        title: l.title,
        description: l.summary || "",
        objectives: [],
        content: l.summary || "",
        activity: "Guided practice activity based on this lesson.",
        quiz: "A short comprehension check quiz for this lesson.",
        resources: [],
        pdfAttachment: null,
        videoUrl: "",
      })),
    }));

    const nowIso = new Date().toISOString();
    const nowDate = nowIso.slice(0, 10);

    const newCourse = {
      id: generateId(),
      name: template.name,
      grade: template.grade,
      subject: template.subject,
      description: template.description,
      status: "draft",
      studentsEnrolled: 0,
      modules: clonedModules,
      lessonsCount: recomputeLessonsCount(clonedModules),
      school_id: schoolId,
      teacher_id: teacherId,
      teacher_name: teacherName,
      origin_template_id: template.id,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdDate: nowDate,
      updatedDate: nowDate,
    };

    setCourses((prev) => [newCourse, ...prev]);
    return newCourse;
  }

  return (
    <CourseContext.Provider
      value={{
        courses,
        assignments,
        addCourse,
        updateCourse,
        deleteCourse,
        getCourseById,
        publishCourse,
        addModule,
        updateModule,
        deleteModule,
        reorderModule,
        addAssignment,
        updateAssignment,
        deleteAssignment,
        getAssignmentsByCourse,
        importTemplate,
      }}
    >
      {children}
    </CourseContext.Provider>
  );
}

export function useCourses() {
  const ctx = useContext(CourseContext);
  if (!ctx) throw new Error("useCourses must be used within CourseProvider");
  return ctx;
}