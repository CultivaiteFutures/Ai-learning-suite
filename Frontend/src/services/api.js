import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach Bearer token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || localStorage.getItem('ails_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Auth API
export const authAPI = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.access_token) {
      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('ails_token', res.data.access_token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      localStorage.setItem('ails_auth_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('ails_token');
    localStorage.removeItem('user');
    localStorage.removeItem('ails_auth_user');
  },
  getCurrentUser: () => api.get('/auth/me'),
};

// Super Admin API
export const superAdminAPI = {
  getSchools: () => api.get('/super-admin/schools'),
  getSchoolById: (id) => api.get(`/super-admin/schools/${id}`),
  createSchool: (data) => api.post('/super-admin/schools', data),
  updateSchool: (id, data) => api.put(`/super-admin/schools/${id}`, data),
  suspendSchool: (id) => api.post(`/super-admin/schools/${id}/suspend`),
  activateSchool: (id) => api.post(`/super-admin/schools/${id}/activate`),
  deleteSchool: (id) => api.delete(`/super-admin/schools/${id}`),
  getStats: () => api.get('/super-admin/stats'),
  getActivityLogs: () => api.get('/super-admin/activity-logs'),
  getGoldenTemplates: () => api.get('/super-admin/golden-templates'),
  createGoldenTemplate: (data) => api.post('/super-admin/golden-templates', data),
};

// School Admin API
export const schoolAdminAPI = {
  getTeachers: () => api.get('/school-admin/teachers'),
  createTeacher: (data) => api.post('/school-admin/teachers', data),
  updateTeacher: (id, data) => api.put(`/school-admin/teachers/${id}`, data),
  deleteTeacher: (id) => api.delete(`/school-admin/teachers/${id}`),
  getStudents: () => api.get('/school-admin/students'),
  createStudent: (data) => api.post('/school-admin/students', data),
  updateStudent: (id, data) => api.put(`/school-admin/students/${id}`, data),
  deleteStudent: (id) => api.delete(`/school-admin/students/${id}`),
  getGrades: () => api.get('/school-admin/grades'),
  createGrade: (data) => api.post('/school-admin/grades', data),
  deleteGrade: (id) => api.delete(`/school-admin/grades/${id}`),
  getStats: () => api.get('/school-admin/stats'),
  getActivityLogs: () => api.get('/school-admin/activity-logs'),
};

// Teacher API
export const teacherAPI = {
  getCourses: () => api.get('/teacher/courses'),
  getCourseDetail: (id) => api.get(`/teacher/courses/${id}`),
  createCourse: (data) => api.post('/teacher/courses', data),
  updateCourse: (id, data) => api.put(`/teacher/courses/${id}`, data),
  deleteCourse: (id) => api.delete(`/teacher/courses/${id}`),
  togglePublish: (courseId) => api.post(`/teacher/courses/${courseId}/publish`),
  addModule: (courseId, data) => api.post(`/teacher/courses/${courseId}/modules`, data),
  updateModule: (courseId, moduleId, data) => api.put(`/teacher/courses/${courseId}/modules/${moduleId}`, data),
  deleteModule: (courseId, moduleId) => api.delete(`/teacher/courses/${courseId}/modules/${moduleId}`),
  addLesson: (courseId, moduleId, data) => api.post(`/teacher/courses/${courseId}/modules/${moduleId}/lessons`, data),
  updateLesson: (courseId, moduleId, lessonId, data) => api.put(`/teacher/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`, data),
  deleteLesson: (courseId, moduleId, lessonId) => api.delete(`/teacher/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`),
  getAssignments: () => api.get('/teacher/assignments'),
  createAssignment: (data) => api.post('/teacher/assignments', data),
  deleteAssignment: (id) => api.delete(`/teacher/assignments/${id}`),
  getGoldenTemplates: () => api.get('/teacher/golden-templates'),
  adoptGoldenTemplate: (templateId) => api.post(`/teacher/adopt-template/${templateId}`),
  getStudents: () => api.get('/teacher/students'),
  getAnalytics: () => api.get('/teacher/analytics'),
  getSubmissions: (assignmentId) => api.get(`/teacher/assignments/${assignmentId}/submissions`),
  gradeSubmission: (submissionId, data) => api.post(`/teacher/submissions/${submissionId}/grade`, data),
  gradeWithAnswerKey: (data) => {
    const formData = new FormData();
    formData.append('submission_id', data.submissionId);
    if (data.answerKeyText) formData.append('answer_key_text', data.answerKeyText);
    if (data.file) formData.append('file', data.file);
    return api.post('/ai/grade-submission-with-answer-key', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  exportGradesExcel: () => api.get('/teacher/grades/export/excel', { responseType: 'blob' }),
  exportGradesPDF: () => api.get('/teacher/grades/export/pdf', { responseType: 'blob' }),
};

// Student API
export const studentAPI = {
  getEnrolledCourses: () => api.get('/student/enrolled-courses'),
  joinCourse: (joinCode) => api.post('/student/join-course', { join_code: joinCode }),
  getCourseDetail: (courseId) => api.get(`/student/courses/${courseId}`),
  markLessonComplete: (lessonId) => api.post(`/student/lessons/${lessonId}/complete`),
  getStats: () => api.get('/student/stats'),
  getAssignments: () => api.get('/student/assignments'),
  submitAssignment: (assignmentId, data) => api.post(`/student/assignments/${assignmentId}/submit`, data),
  getGames: () => api.get('/student/games'),
  submitGameScore: (gameId, score) => api.post(`/student/games/${gameId}/submit`, { score }),
};

// AI Services
export const aiAPI = {
  generateCourse: (data) => api.post('/ai/generate-course', data),
  generateAssignment: (data) => api.post('/ai/generate-assignment', data),
  generateCourseFromPDF: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/ai/generate-course-from-pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  tutorChat: (data) => api.post('/ai/tutor-chat', data),
};

export default api;