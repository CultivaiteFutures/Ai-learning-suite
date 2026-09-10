import { createContext, useContext, useState, useEffect } from "react";
import { generateId } from "../utils/generateId";
import { teacherAPI } from "../services/api";

const CourseContext = createContext(null);

function recomputeLessonsCount(modules) {
  return (modules || []).reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
}

export function CourseProvider({ children }) {
  const [courses, setCourses] = useState([]);
  // True until the initial GET .../courses resolves (or there's no token to
  // fetch with). A course-by-id page must wait for this before concluding
  // "not found", otherwise a hard refresh/direct link to a real course
  // briefly (or, worse, permanently if it navigates away) shows "not found"
  // because `courses` is still its initial empty array on first render.
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  // Surfaces a real backend error (e.g. a 403 from the course-ownership rule --
  // "only the course's teacher or a school admin can do this") instead of the
  // UI silently pretending an update/delete succeeded when it didn't.
  const [courseError, setCourseError] = useState("");

  // Sync teacher courses & assignments exclusively with FastAPI backend
  useEffect(() => {
    const token = localStorage.getItem("token") || localStorage.getItem("ails_token");
    if (!token) {
      setAssignmentsLoading(false);
      setCoursesLoading(false);
      return;
    }

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
          status: c.isPublished ? "published" : "draft",
          studentsEnrolled: 0,
          school_id: c.schoolId,
          createdById: c.createdById || c.created_by_id || null,
          modules: (c.modules || []).map((m) => ({
            id: m.id,
            name: m.title || m.name,
            description: m.description,
            lessons: (m.lessons || []).map((l) => ({
              id: l.id,
              title: l.title || l.name,
              description: l.summary || l.content || "",
              content: l.content || "",
              durationMinutes: l.durationMinutes || 30
            }))
          })),
          lessonsCount: recomputeLessonsCount(c.modules)
        }));
        setCourses(fetchedC);
      }
      setCoursesLoading(false);
    }).catch(() => {
      setCourses([]);
      setCoursesLoading(false);
    });

    teacherAPI.getAssignments().then((res) => {
      if (res.data && Array.isArray(res.data)) {
        // Backend serializes with alias_generator=to_camel, so real JSON keys are
        // camelCase (courseId, dueDate, maxPoints, answerKey) -- fall back to the
        // snake_case name too in case that ever changes server-side.
        const fetchedA = res.data.map((a) => ({
          id: a.id,
          courseId: a.course_id || a.courseId,
          title: a.title,
          description: a.description,
          dueDate: (a.due_date || a.dueDate) ? (a.due_date || a.dueDate).slice(0, 10) : "",
          maxPoints: a.max_points || a.maxPoints || 100,
          answerKey: a.answer_key || a.answerKey || "",
          type: a.type || "Quiz",
          rubricId: a.rubric_id || a.rubricId || null,
          status: "open"
        }));
        setAssignments(fetchedA);
      }
      setAssignmentsLoading(false);
    }).catch(() => {
      setAssignments([]);
      setAssignmentsLoading(false);
    });
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
        grade: created.grade || created.gradeLevel,
        subject: created.subject,
        description: created.description,
        status: created.isPublished ? "published" : "draft",
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

  async function updateCourse(id, data) {
    const course = courses.find((c) => c.id === id);
    const mergedModules = data.modules !== undefined ? data.modules : (course?.modules || []);

    const payload = {
      title: data.name !== undefined ? data.name : (data.title !== undefined ? data.title : course?.name),
      description: data.description !== undefined ? data.description : (course?.description || ""),
      subject: data.subject !== undefined ? data.subject : (course?.subject || ""),
      grade_level: data.grade !== undefined ? data.grade : (data.grade_level !== undefined ? data.grade_level : (course?.grade || "")),
      language: data.language || course?.language || "English",
      difficulty: data.difficulty || course?.difficulty || "Medium",
    };

    if (mergedModules && mergedModules.length > 0) {
      payload.modules = mergedModules.map((m, mIdx) => ({
        title: m.name || m.title || `Module ${mIdx + 1}`,
        description: m.description || "",
        order: mIdx,
        lessons: (m.lessons || []).map((l, lIdx) => ({
          title: l.title || l.name || `Lesson ${lIdx + 1}`,
          content: l.content || "",
          summary: l.description || l.summary || "",
          duration_minutes: l.durationMinutes || l.duration_minutes || 30,
          order: lIdx,
          activities: l.activity || l.activities || null,
          quiz: l.quiz || null,
          homework: l.homework || null
        }))
      }));
    }

    try {
      await teacherAPI.updateCourse(id, payload);
    } catch (err) {
      console.error("Error updating course in backend:", err);
      setCourseError(
        err?.response?.status === 403
          ? "You don't have permission to edit this course -- it belongs to another teacher."
          : (err?.response?.data?.detail || "Failed to update the course. Please try again.")
      );
      return false;
    }

    setCourseError("");
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const merged = { ...c, ...data, updatedDate: new Date().toISOString().slice(0, 10) };
        if (data.modules) merged.lessonsCount = recomputeLessonsCount(data.modules);
        return merged;
      })
    );
    return true;
  }

  async function deleteCourse(id) {
    try {
      await teacherAPI.deleteCourse(id);
    } catch (err) {
      console.error("Error deleting course in backend:", err);
      setCourseError(
        err?.response?.status === 403
          ? "You don't have permission to delete this course -- it belongs to another teacher."
          : (err?.response?.data?.detail || "Failed to delete the course. Please try again.")
      );
      return false;
    }
    setCourseError("");
    setCourses((prev) => prev.filter((c) => c.id !== id));
    setAssignments((prev) => prev.filter((a) => a.courseId !== id));
    return true;
  }

  function clearCourseError() {
    setCourseError("");
  }

  function getCourseById(id) {
    return courses.find((c) => c.id === id) || null;
  }

  async function publishCourse(id) {
    const course = getCourseById(id);
    if (course) {
      const ok = await updateCourse(id, { ...course, status: "published" });
      if (!ok) return false;
    }
    try {
      await teacherAPI.togglePublish(id);
    } catch (err) {
      console.error("Error publishing course:", err);
      setCourseError(
        err?.response?.status === 403
          ? "You don't have permission to publish this course -- it belongs to another teacher."
          : (err?.response?.data?.detail || "Failed to publish the course. Please try again.")
      );
      return false;
    }
    setCourseError("");
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "published" } : c))
    );
    return true;
  }

  function addModule(courseId, extra = {}) {
    const course = getCourseById(courseId);
    if (!course) return;
    const title = `Module ${(course.modules?.length || 0) + 1}`;
    teacherAPI.addModule(courseId, {
      title,
      description: "",
      publishAt: extra.publishAt || null,
      prerequisiteModuleId: extra.prerequisiteModuleId || null,
    }).then((res) => {
      const createdM = res.data;
      const modules = [...(course.modules || []), {
        id: createdM.id,
        name: createdM.title,
        description: "",
        lessons: [],
        publishAt: createdM.publishAt || createdM.publish_at || null,
        prerequisiteModuleId: createdM.prerequisiteModuleId || createdM.prerequisite_module_id || null,
      }];
      updateCourse(courseId, { modules });
    }).catch(() => {
      const modules = [...(course.modules || []), { id: generateId(), name: title, description: "", lessons: [] }];
      updateCourse(courseId, { modules });
    });
  }

  function updateModule(courseId, moduleId, data) {
    const course = getCourseById(courseId);
    if (!course) return;
    const modules = (course.modules || []).map((m) => (m.id === moduleId ? { ...m, ...data } : m));
    updateCourse(courseId, { modules });
  }

  // Persists publishAt (Scheduled Module Release) / prerequisiteModuleId (Module
  // Prerequisites) via the single-module endpoint, which operates on the module's
  // real, stable id. Kept separate from updateModule/updateCourse above -- those
  // route through the full-course PUT, which deletes and recreates every module
  // with a fresh id on each save, so a prerequisite id set that way would dangle.
  function updateModuleSchedule(courseId, moduleId, { publishAt, prerequisiteModuleId } = {}) {
    const course = getCourseById(courseId);
    if (!course) return Promise.resolve();
    const module = (course.modules || []).find((m) => m.id === moduleId);
    if (!module) return Promise.resolve();

    const modules = (course.modules || []).map((m) =>
      m.id === moduleId ? { ...m, publishAt: publishAt ?? null, prerequisiteModuleId: prerequisiteModuleId ?? null } : m
    );
    setCourses((prev) => prev.map((c) => (c.id === courseId ? { ...c, modules } : c)));

    return teacherAPI.updateModule(courseId, moduleId, {
      title: module.name || module.title,
      description: module.description || "",
      publishAt: publishAt ?? null,
      prerequisiteModuleId: prerequisiteModuleId ?? null,
    }).catch((err) => {
      console.error("Error updating module schedule in backend:", err);
      throw err;
    });
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
    return teacherAPI.createAssignment({
      course_id: data.courseId,
      lesson_id: data.lessonId || null,
      title: data.title,
      description: data.description,
      due_date: data.dueDate,
      max_points: Number(data.maxPoints) || 100,
      answer_key: data.answerKey,
      target_type: data.targetType || "all",
      target_grade: data.targetGrade,
      target_section: data.targetSection,
      type: data.type || "Quiz",
      config: data.config || null,
      rubric_id: data.rubricId || null,
    }).then((res) => {
      const createdA = res.data;
      const saved = {
        id: createdA.id,
        submissionsCount: 0,
        status: "open",
        ...data,
        type: createdA.type || data.type || "Quiz",
        config: createdA.config || data.config || null,
        rubricId: createdA.rubric_id || createdA.rubricId || data.rubricId || null
      };
      setAssignments((prev) => [saved, ...prev]);
      return saved;
    }).catch(() => {
      const newAssignment = { id: generateId(), submissionsCount: 0, status: "open", ...data };
      setAssignments((prev) => [newAssignment, ...prev]);
      return newAssignment;
    });
  }

  function updateAssignment(id, data) {
    return teacherAPI.updateAssignment(id, {
      course_id: data.courseId,
      lesson_id: data.lessonId || null,
      title: data.title,
      description: data.description,
      due_date: data.dueDate,
      max_points: Number(data.maxPoints) || 100,
      answer_key: data.answerKey,
      target_type: data.targetType || "all",
      target_grade: data.targetGrade,
      target_section: data.targetSection,
      type: data.type || "Quiz",
      config: data.config || null,
      rubric_id: data.rubricId || null,
    }).then((res) => {
      const updated = res.data;
      let savedAssignment = null;
      setAssignments((prev) => prev.map((a) => {
        if (a.id !== id) return a;
        savedAssignment = {
          ...a,
          ...data,
          type: updated.type || data.type || "Quiz",
          config: updated.config !== undefined ? updated.config : (data.config || null),
          rubricId: (updated.rubric_id || updated.rubricId) !== undefined ? (updated.rubric_id || updated.rubricId) : (data.rubricId || null),
        };
        return savedAssignment;
      }));
      return savedAssignment || { id, ...data };
    }).catch((err) => {
      console.error("Error updating assignment in backend:", err);
      return { id, ...data };
    });
  }

  function deleteAssignment(id) {
    teacherAPI.deleteAssignment(id).catch(() => {});
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  }

  function getAssignmentsByCourse(courseId) {
    return assignments.filter((a) => a.courseId === courseId);
  }

  return (
    <CourseContext.Provider
      value={{
        courses,
        coursesLoading,
        assignments,
        courseError,
        clearCourseError,
        addCourse,
        updateCourse,
        deleteCourse,
        getCourseById,
        publishCourse,
        addModule,
        updateModule,
        updateModuleSchedule,
        deleteModule,
        reorderModule,
        assignmentsLoading,
        addAssignment,
        updateAssignment,
        deleteAssignment,
        getAssignmentsByCourse,
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