import { createContext, useContext, useState, useEffect } from "react";
import { generateId } from "../utils/generateId";
import { useSchools } from "./SchoolContext";
import { teacherAPI } from "../services/api";

const CourseContext = createContext(null);

function recomputeLessonsCount(modules) {
  return (modules || []).reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
}

export function CourseProvider({ children }) {
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const { goldenTemplates } = useSchools();

  // Sync teacher courses & assignments exclusively with FastAPI backend
  useEffect(() => {
    const token = localStorage.getItem("token") || localStorage.getItem("ails_token");
    if (!token) return;

    teacherAPI.getCourses().then((res) => {
      if (res.data && Array.isArray(res.data)) {
        const fetchedC = res.data.map((c) => ({
          id: c.id,
          name: c.title || c.name,
          title: c.title || c.name,
          joinCode: c.join_code || c.joinCode,
          join_code: c.join_code || c.joinCode,
          grade: c.grade_level || c.grade,
          subject: c.subject,
          description: c.description,
          status: c.is_published ? "published" : "draft",
          studentsEnrolled: 0,
          school_id: c.school_id,
          modules: (c.modules || []).map((m) => ({
            id: m.id,
            name: m.title || m.name,
            description: m.description,
            lessons: (m.lessons || []).map((l) => ({
              id: l.id,
              title: l.title || l.name,
              description: l.summary || l.content || "",
              content: l.content || "",
              durationMinutes: l.duration_minutes || 30
            }))
          })),
          lessonsCount: recomputeLessonsCount(c.modules)
        }));
        setCourses(fetchedC);
      }
    }).catch(() => setCourses([]));

    teacherAPI.getAssignments().then((res) => {
      if (res.data && Array.isArray(res.data)) {
        const fetchedA = res.data.map((a) => ({
          id: a.id,
          courseId: a.course_id,
          title: a.title,
          description: a.description,
          dueDate: a.due_date ? a.due_date.slice(0, 10) : "",
          maxPoints: a.max_points || 100,
          status: "open"
        }));
        setAssignments(fetchedA);
      }
    }).catch(() => setAssignments([]));
  }, []);

  async function addCourse(data) {
    const { modules: incomingModules, ...rest } = data;
    const modules = incomingModules || [];
    
    try {
      const res = await teacherAPI.createCourse({
        title: data.name || data.title,
        description: data.description || "",
        subject: data.subject || "",
        grade_level: data.grade || "",
        language: data.language || "English",
        difficulty: data.difficulty || "Medium",
        modules: modules.map((m) => ({
          title: m.name || m.title,
          description: m.description || "",
          lessons: (m.lessons || []).map((l) => ({
            title: l.title,
            content: l.content || "",
            summary: l.description || ""
          }))
        }))
      });
      const created = res.data;
      const newCourse = {
        id: created.id,
        name: created.title,
        joinCode: created.join_code || created.joinCode,
        join_code: created.join_code || created.joinCode,
        grade: created.grade_level,
        subject: created.subject,
        description: created.description,
        status: created.is_published ? "published" : "draft",
        studentsEnrolled: 0,
        modules: created.modules || modules,
        lessonsCount: recomputeLessonsCount(created.modules || modules)
      };
      setCourses((prev) => [newCourse, ...prev]);
      return newCourse;
    } catch (err) {
      const newCourse = {
        id: generateId(),
        joinCode: generateId().slice(0, 6).toUpperCase(),
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
  }

  function updateCourse(id, data) {
    teacherAPI.updateCourse(id, {
      title: data.name || data.title,
      description: data.description,
      subject: data.subject,
      grade_level: data.grade
    }).catch(() => {});

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
    teacherAPI.deleteCourse(id).catch(() => {});
    setCourses((prev) => prev.filter((c) => c.id !== id));
    setAssignments((prev) => prev.filter((a) => a.courseId !== id));
  }

  function getCourseById(id) {
    return courses.find((c) => c.id === id) || null;
  }

  function publishCourse(id) {
    teacherAPI.togglePublish(id).catch(() => {});
    updateCourse(id, { status: "published" });
  }

  function addModule(courseId) {
    const course = getCourseById(courseId);
    if (!course) return;
    const title = `Module ${(course.modules?.length || 0) + 1}`;
    teacherAPI.addModule(courseId, { title, description: "" }).then((res) => {
      const createdM = res.data;
      const modules = [...(course.modules || []), { id: createdM.id, name: createdM.title, description: "", lessons: [] }];
      updateCourse(courseId, { modules });
    }).catch(() => {
      const modules = [...(course.modules || []), { id: generateId(), name: title, description: "", lessons: [] }];
      updateCourse(courseId, { modules });
    });
  }

  function updateModule(courseId, moduleId, data) {
    const course = getCourseById(courseId);
    if (!course) return;
    teacherAPI.updateModule(courseId, moduleId, { title: data.name || data.title, description: data.description }).catch(() => {});
    const modules = (course.modules || []).map((m) => (m.id === moduleId ? { ...m, ...data } : m));
    updateCourse(courseId, { modules });
  }

  function deleteModule(courseId, moduleId) {
    const course = getCourseById(courseId);
    if (!course) return;
    teacherAPI.deleteModule(courseId, moduleId).catch(() => {});
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
    teacherAPI.createAssignment({
      course_id: data.courseId,
      title: data.title,
      description: data.description,
      due_date: data.dueDate,
      max_points: Number(data.maxPoints) || 100
    }).then((res) => {
      const createdA = res.data;
      setAssignments((prev) => [{ id: createdA.id, submissionsCount: 0, status: "open", ...data }, ...prev]);
    }).catch(() => {
      const newAssignment = { id: generateId(), submissionsCount: 0, status: "open", ...data };
      setAssignments((prev) => [newAssignment, ...prev]);
    });
  }

  function updateAssignment(id, data) {
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
  }

  function deleteAssignment(id) {
    teacherAPI.deleteAssignment(id).catch(() => {});
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  }

  function getAssignmentsByCourse(courseId) {
    return assignments.filter((a) => a.courseId === courseId);
  }

  async function importTemplate(templateId, teacherId, schoolId, teacherName) {
    const template = goldenTemplates.find((t) => t.id === templateId);
    if (!template) return null;

    try {
      const res = await teacherAPI.adoptGoldenTemplate(templateId);
      const cloned = res.data;
      const newCourse = {
        id: cloned.id,
        name: cloned.title,
        joinCode: cloned.join_code || cloned.joinCode,
        join_code: cloned.join_code || cloned.joinCode,
        grade: cloned.grade_level,
        subject: cloned.subject,
        description: cloned.description,
        status: "draft",
        studentsEnrolled: 0,
        modules: cloned.modules || [],
        lessonsCount: recomputeLessonsCount(cloned.modules || []),
        school_id: schoolId,
        teacher_id: teacherId,
        teacher_name: teacherName,
        origin_template_id: templateId,
      };
      setCourses((prev) => [newCourse, ...prev]);
      return newCourse;
    } catch (err) {
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

      const newCourse = {
        id: generateId(),
        name: template.name,
        joinCode: generateId().slice(0, 6).toUpperCase(),
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
      };

      setCourses((prev) => [newCourse, ...prev]);
      return newCourse;
    }
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