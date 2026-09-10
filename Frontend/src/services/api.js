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
// SSO (Task #62) -- public, pre-login endpoints. See ssoAPI usage in
// LoginForm.jsx (provider discovery as the user types their email) and
// SsoCallbackPage.jsx (exchanging the token the backend redirect carries).
export const ssoAPI = {
  lookupProviders: (email) => api.get('/sso/providers', { params: { email } }),
  startLogin: (provider, email) => api.get(`/sso/${provider}/start`, { params: { email } }),
};

export const authAPI = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    // The backend's UserRole enum is uppercase (e.g. "SUPER_ADMIN"), but every
    // frontend role-keyed lookup (NAVIGATION_CONFIG, ROLE_HOME, RoleRoute) uses
    // lowercase snake_case keys ("super_admin"). Normalize once, here, at the
    // single point every login response passes through, so nothing downstream
    // has to remember to do it.
    if (res.data.user && typeof res.data.user.role === 'string') {
      res.data.user = { ...res.data.user, role: res.data.user.role.toLowerCase() };
    }
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
  getMaintenanceStatus: () => api.get('/auth/maintenance-status'),
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
  exportActivityLogsCsv: () => api.get('/super-admin/activity-logs/export.csv', { responseType: 'blob' }),
  resetUserPasswordSupport: (userId) => api.post(`/super-admin/users/${userId}/reset-password`),
  getSupportNotes: (schoolId) => api.get(`/super-admin/schools/${schoolId}/support-notes`),
  addSupportNote: (schoolId, note) => api.post(`/super-admin/schools/${schoolId}/support-notes`, { note }),
  getSubscriptions: () => api.get('/super-admin/subscriptions'),
  updateSubscription: (schoolId, data) => api.put(`/super-admin/subscriptions/${schoolId}`, data),
  getAiUsage: () => api.get('/super-admin/ai-usage'),
  getMaintenanceSettings: () => api.get('/super-admin/maintenance'),
  updateMaintenanceSettings: (data) => api.put('/super-admin/maintenance', data),
  getPlatformSettings: () => api.get('/super-admin/settings'),
  updatePlatformSettings: (data) => api.put('/super-admin/settings', data),
  getComplaints: (statusFilter) => api.get('/super-admin/complaints', { params: statusFilter ? { status_filter: statusFilter } : {} }),
  updateComplaint: (id, data) => api.put(`/super-admin/complaints/${id}`, data),
  getSchoolTeachers: (schoolId) => api.get(`/super-admin/schools/${schoolId}/teachers`),
  getSchoolStudents: (schoolId) => api.get(`/super-admin/schools/${schoolId}/students`),
  getSchoolCourses: (schoolId) => api.get(`/super-admin/schools/${schoolId}/courses`),
};

// School Admin API
export const schoolAdminAPI = {
  getTeachers: () => api.get('/school-admin/teachers'),
  createTeacher: (data) => api.post('/school-admin/teachers', data),
  updateTeacher: (id, data) => api.put(`/school-admin/teachers/${id}`, data),
  deleteTeacher: (id) => api.delete(`/school-admin/teachers/${id}`),
  // Admin-initiated password reset (no email service is wired up for a
  // self-service "forgot password" flow yet, so this is the recovery path:
  // admin resets, then hands the new temp password to the user directly).
  resetPassword: (userId) => api.post(`/school-admin/users/${userId}/reset-password`),
  getStudents: () => api.get('/school-admin/students'),
  createStudent: (data) => api.post('/school-admin/students', data),
  updateStudent: (id, data) => api.put(`/school-admin/students/${id}`, data),
  deleteStudent: (id) => api.delete(`/school-admin/students/${id}`),
  getGrades: () => api.get('/school-admin/grades'),
  getCourses: () => api.get('/school-admin/courses'), // read-only, for course-scoped announcement picker
  createGrade: (data) => api.post('/school-admin/grades', data),
  deleteGrade: (id) => api.delete(`/school-admin/grades/${id}`),
  getActivityLogs: () => api.get('/school-admin/activity-logs'),
  exportStudentData: (studentId) => api.get(`/school-admin/students/${studentId}/export-data`, { responseType: 'blob' }),
  getDataRequests: () => api.get('/school-admin/data-requests'),
  fulfillDataRequest: (requestId) => api.post(`/school-admin/data-requests/${requestId}/fulfill`),
  dismissDataRequest: (requestId) => api.post(`/school-admin/data-requests/${requestId}/dismiss`),
  getSsoConfig: () => api.get('/school-admin/sso-config'),
  updateSsoConfig: (provider, data) => api.put(`/school-admin/sso-config/${provider}`, data),
  getComplaints: () => api.get('/school-admin/complaints'),
  createComplaint: (data) => api.post('/school-admin/complaints', data),
  downloadStudentTemplate: () => api.get('/school-admin/students/excel-template', { responseType: 'blob' }),
  uploadStudentsExcel: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/school-admin/students/upload-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  downloadTeacherTemplate: () => api.get('/school-admin/teachers/csv-template', { responseType: 'blob' }),
  uploadTeachersCsv: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/school-admin/teachers/upload-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  exportRosterCsv: (role = 'all') => api.get('/school-admin/roster/export.csv', { params: { role }, responseType: 'blob' }),
  updateSchoolSettings: (data) => api.put('/school-admin/settings/school', data),
  updateAdminProfile: (data) => api.put('/school-admin/settings/profile', data),
  changeAdminPassword: (data) => api.post('/school-admin/settings/change-password', data),
  getParents: () => api.get('/school-admin/parents'),
  createParent: (data) => api.post('/school-admin/parents', data),
  updateParent: (id, data) => api.put(`/school-admin/parents/${id}`, data),
  deleteParent: (id) => api.delete(`/school-admin/parents/${id}`),
  getStudentReportCard: (studentId) => api.get(`/school-admin/students/${studentId}/report-card`, { responseType: 'blob' }),
  search: (q) => api.get('/school-admin/search', { params: { q } }),
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
  updateAssignment: (id, data) => api.put(`/teacher/assignments/${id}`, data),
  deleteAssignment: (id) => api.delete(`/teacher/assignments/${id}`),
  extractAnswerKeyPDF: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/teacher/assignments/extract-answer-key-pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getStudents: () => api.get('/teacher/students'),
  getCourseStudents: (courseId) => api.get(`/teacher/courses/${courseId}/students`),
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
  gradeWithRubric: (submissionId) => {
    const formData = new FormData();
    formData.append('submission_id', submissionId);
    return api.post('/ai/grade-submission-with-rubric', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  exportGradesExcel: () => api.get('/teacher/grades/export/excel', { responseType: 'blob' }),
  exportGradesPDF: () => api.get('/teacher/grades/export/pdf', { responseType: 'blob' }),
  getStudentReportCard: (studentId) => api.get(`/teacher/students/${studentId}/report-card`, { responseType: 'blob' }),
  search: (q) => api.get('/teacher/search', { params: { q } }),
  updateProfile: (data) => api.put('/teacher/settings/profile', data),
  changePassword: (data) => api.post('/teacher/settings/change-password', data),
  getCoTeachers: (courseId) => api.get(`/teacher/courses/${courseId}/co-teachers`),
  addCoTeacher: (courseId, email) => api.post(`/teacher/courses/${courseId}/co-teachers`, { email }),
  removeCoTeacher: (courseId, teacherId) => api.delete(`/teacher/courses/${courseId}/co-teachers/${teacherId}`),
  markAttendance: (data) => api.post('/attendance/mark', data),
  getCourseAttendance: (courseId, date) => api.get(`/attendance/course/${courseId}`, date ? { params: { date } } : undefined),
  getCourseAttendanceSummary: (courseId) => api.get(`/attendance/course/${courseId}/summary`),
};

// Student API
export const studentAPI = {
  getEnrolledCourses: () => api.get('/student/enrolled-courses'),
  joinCourse: (joinCode) => api.post('/student/join-course', { join_code: joinCode }),
  getCourseDetail: (courseId) => api.get(`/student/courses/${courseId}`),
  markLessonComplete: (lessonId) => api.post(`/student/lessons/${lessonId}/complete`),
  getLessonNotes: (lessonId) => api.get(`/student/lessons/${lessonId}/notes`),
  setLessonNotes: (lessonId, data) => api.put(`/student/lessons/${lessonId}/notes`, data),
  getBookmarks: () => api.get('/student/bookmarks'),
  search: (q) => api.get('/student/search', { params: { q } }),
  getStats: () => api.get('/student/stats'),
  getProfile: () => api.get('/student/profile'),
  changePassword: (data) => api.post('/student/change-password', data),
  getAssignments: () => api.get('/student/assignments'),
  submitAssignment: (assignmentId, data) => api.post(`/student/assignments/${assignmentId}/submit`, data),
  uploadSubmissionFile: (assignmentId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/student/assignments/${assignmentId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getGames: () => api.get('/student/games'),
  submitGameScore: (gameId, score) => api.post(`/student/games/${gameId}/submit`, { score }),
  getLeaderboard: () => api.get('/student/leaderboard'),
  getAttendance: () => api.get('/student/attendance'),
  exportMyData: () => api.get('/student/me/export-data', { responseType: 'blob' }),
  requestMyDeletion: (note) => api.post('/student/me/request-deletion', note ? { note } : {}),
};

// Parent API (read-only view of a guardian's own linked children)
export const parentAPI = {
  getChildren: () => api.get('/parent/children'),
  getChildStats: (studentId) => api.get(`/parent/children/${studentId}/stats`),
  getChildCourses: (studentId) => api.get(`/parent/children/${studentId}/courses`),
  getChildAssignments: (studentId) => api.get(`/parent/children/${studentId}/assignments`),
  getChildAttendance: (studentId) => api.get(`/parent/children/${studentId}/attendance`),
  exportChildData: (studentId) => api.get(`/parent/children/${studentId}/export-data`, { responseType: 'blob' }),
  requestChildDeletion: (studentId, note) => api.post(`/parent/children/${studentId}/request-deletion`, note ? { note } : {}),
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

// Announcements API (Teacher/Admin create + list + delete, Student read-only via list)
export const announcementsAPI = {
  list: () => api.get('/announcements'),
  create: (data) => api.post('/announcements', data),
  remove: (id) => api.delete(`/announcements/${id}`),
};

// Discussions / Doubts API (course-scoped Q&A, Student/Teacher)
export const discussionsAPI = {
  listByCourse: (courseId) => api.get('/discussions', { params: { course_id: courseId } }),
  getById: (id) => api.get(`/discussions/${id}`),
  create: (data) => api.post('/discussions', data),
  reply: (id, data) => api.post(`/discussions/${id}/replies`, data),
  setResolved: (id, isResolved) => api.patch(`/discussions/${id}`, { is_resolved: isResolved }),
};

// Academic Calendar API (Teacher/Admin create + delete, all roles list -- scoped server-side)
export const calendarAPI = {
  listEvents: () => api.get('/calendar/events'),
  createEvent: (data) => api.post('/calendar/events', data),
  deleteEvent: (id) => api.delete(`/calendar/events/${id}`),
  exportIcs: () => api.get('/calendar/export.ics', { responseType: 'blob' }),
  getSyncToken: () => api.get('/calendar/sync-token'),
  regenerateSyncToken: () => api.post('/calendar/sync-token/regenerate'),
};

// Challenges API -- School Admin authors a school-wide, grade-scoped quiz
// (multiple-choice / true-false, auto-graded); Teacher gets view-only
// access to challenges reaching their students' grades; Student takes the
// quiz directly via submitChallenge (no separate "join" step anymore).
export const challengesAPI = {
  getChallenges: (activeOnly) => api.get('/challenges', { params: activeOnly === undefined ? undefined : { active_only: activeOnly } }),
  getChallenge: (id) => api.get(`/challenges/${id}`),
  createChallenge: (data) => api.post('/challenges', data),
  updateChallenge: (id, data) => api.put(`/challenges/${id}`, data),
  submitChallenge: (id, data) => api.post(`/challenges/${id}/submit`, data),
  getLeaderboard: (id) => api.get(`/challenges/${id}/leaderboard`),
  deleteChallenge: (id) => api.delete(`/challenges/${id}`),
};

// Direct 1:1 Messaging API (Teacher <-> Student/Parent, scoped server-side
// to people the caller actually has a course relationship with)
export const messagingAPI = {
  listContacts: () => api.get('/messages/contacts'),
  listConversations: () => api.get('/messages/conversations'),
  startConversation: (recipientId) => api.post('/messages/conversations', { recipientId }),
  listMessages: (conversationId) => api.get(`/messages/conversations/${conversationId}/messages`),
  sendMessage: (conversationId, body) => api.post(`/messages/conversations/${conversationId}/messages`, { body }),
};

// Grading Rubrics API (Teacher owns their own; Admin sees every rubric in
// the school). Attached to an Assignment via rubricId; used when grading
// a submission against that rubric's criteria.
export const rubricsAPI = {
  list: () => api.get('/rubrics'),
  get: (id) => api.get(`/rubrics/${id}`),
  create: (data) => api.post('/rubrics', data),
  update: (id, data) => api.put(`/rubrics/${id}`, data),
  remove: (id) => api.delete(`/rubrics/${id}`),
};

// Notifications API (bell icon: real unread count + in-app feed, instant-event-triggered only)
export const notificationsAPI = {
  list: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

// Fun Games management API (Teacher/Admin: create, list, detail w/ stats, update, delete)
export const gamesAPI = {
  createGame: (data) => api.post('/games', data),
  getGames: (courseId) => api.get('/games', courseId ? { params: { course_id: courseId } } : undefined),
  getGame: (id) => api.get(`/games/${id}`),
  updateGame: (id, data) => api.put(`/games/${id}`, data),
  deleteGame: (id) => api.delete(`/games/${id}`),
};

export default api;