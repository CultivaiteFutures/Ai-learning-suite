# AI Learning Suite — Progress Report (Phase 1: Fix + Wire)

Scope of this pass, as you chose it: fix correctness/security issues and wire up backend
functionality that already existed but wasn't reachable from the UI, before starting on
brand-new modules (Announcements, Discussions, Calendar, Scheduled Release, Prerequisites,
Teacher Reports, teacher-facing AI Assistant). Those remain for the next pass.

---

## 1. What was already working

- Real FastAPI + PostgreSQL backend with a genuine multi-tenant schema: schools, users
  (4 roles), courses/modules/lessons, grades, enrollments, lesson progress, assignments,
  submissions, student stats, evaluation games/results, subscriptions, activity logs.
- JWT auth with server-derived role checks and tenant (`school_id`) scoping, correctly
  applied across the teacher/student/school-admin routers — verified no cross-tenant leak
  in the core CRUD paths.
- Full CRUD: Super Admin (schools, golden templates), School Admin (teachers, students,
  grades, Excel bulk upload), Teacher (courses, modules, lessons, assignments).
- A genuinely provider-independent AI abstraction (Gemini/Claude, chosen per school,
  no hardcoded provider) that boots fine with no API key configured and only fails the
  specific AI call it's asked to make.
- Real PDF text extraction feeding AI course generation, and real Excel/PDF gradebook
  exports.
- Real student flows: join-by-code, lesson completion, assignment submission, games.
- A full page/route set on the frontend for all four roles, most of it already calling
  real endpoints.

## 2. What I changed this pass

**Backend**
- **Security fix**: `ai.py`'s tutor-chat and AI-grading endpoints had no role check and no
  tenant scoping — any authenticated user of any school could pull another school's course
  content through the tutor, or invoke the teacher-only AI-grading action on any school's
  submission. Added role guards and server-side tenant/enrollment-checked lookups.
- **Missing dependencies**: `google-genai`, `openpyxl`, `reportlab`, `email-validator` were
  used in code but absent from `requirements.txt` — a clean install would fail to boot or
  500 on every Excel/PDF export and login route. Added all four.
- **Schema drift**: `assignments.type`/`assignments.config` existed on the ORM model but
  neither Alembic migration created them — added migration `0003`.
- **Mock data removed**: `seed.py` was creating two fake schools and six fake users, all
  sharing the password `password123`. It now only bootstraps the real super-admin account
  from `.env`, same as the app's own startup hook.
- **New/fixed endpoints**: `PUT /teacher/assignments/{id}` (editing an assignment silently
  never saved before), real `averageCompletionRate` in `/teacher/analytics` (was a hardcoded
  `78`), `GET /teacher/courses/{id}/students` (real enrollment, replacing a grade-matching
  guess), `PUT /teacher/settings/profile` + `POST /teacher/settings/change-password`,
  `PUT /super-admin/subscriptions/{school_id}` + a properly-schemed subscriptions list,
  `GET /student/leaderboard` (real, XP-ranked, tenant-scoped), server-side password
  generation for school/teacher/student creation (was client-side `Math.random()`).

**Frontend**
- **Critical bug**: role lookups (`NAVIGATION_CONFIG`, `ROLE_HOME`, `ROLE_LABELS`) are keyed
  lowercase, but the backend returns roles uppercase (`"TEACHER"`). This silently broke
  post-login redirects and sidebar nav for every real login. Fixed at the source plus
  defensively at every lookup site.
- **Route guards added**: any authenticated user could previously reach any other role's
  pages by typing the URL. Added a `RoleRoute` guard per role section.
- **Build-breaking casing bug**: the components folder is `Components/` on disk but every
  one of 130+ imports reference lowercase `components/` — worked by accident on Windows'
  case-insensitive filesystem, would fail to build on any case-sensitive host (Linux, Docker,
  most cloud deploy targets). Renamed the folder to match.
- **Systemic snake_case/camelCase mismatch**: the backend's schemas serialize as camelCase,
  but several frontend contexts read snake_case keys — silently breaking course
  publish-status, assignment course/due-date/points, school active-status, and more, on
  every refetch. Audited and fixed every occurrence.
- Built the **Submissions & Grading** page (didn't exist as UI at all), wired to real
  grading + AI-assisted-grading endpoints.
- Wired real **Analytics** (removed a fabricated 6-week score-trend chart) and real
  **Activity Logs** (was session-only, reset on refresh).
- Made **Subscriptions** real end-to-end (was a fully fake client-side save).
- Removed fabricated gamification: fake weekly-study chart, fake badge-unlock heuristics,
  fake single-entry leaderboard — replaced with real data (added the leaderboard endpoint
  above) or an honest "not tracked yet" state.
- Fixed a hardcoded fake join code fallback and a fake grade-matched "enrollment" list on
  course detail pages.
- Fixed Teacher Settings calling the wrong (School-Admin) backend endpoints.
- Deleted 16 confirmed-dead files (empty/duplicate stub pages and components).

## 3. What remains incomplete

- The five greenfield modules, deferred as agreed: **Announcements, Discussions/Doubts,
  Academic Calendar, Scheduled Module Release, Module Prerequisites** — no models, routes,
  or pages exist yet for any of these.
- A dedicated **Teacher Reports** page (only an Admin-level export page exists today) and a
  **teacher-facing AI Teaching Assistant** (today's AI Tutor is student-only).
- The AI-generated `quiz` JSON on a lesson is stored but never operationalized into a
  student-facing "take the quiz, get auto-scored" flow.
- `pdf_service` has no chunking or OCR fallback — a large or scanned PDF still silently
  truncates or under-performs at the AI-provider layer.
- No historical/trend analytics exist yet (no time-series data model) — this pass replaced
  a fake trend chart with an honest "not tracked yet" note rather than inventing one.

## 4. Files changed

144 files created/modified, 16 deleted (`git status --short` in the repo). Grouped:
- **Backend security/schema**: `app/api/v1/ai.py`, `requirements.txt`,
  `alembic/versions/0003_add_assignment_type_and_config.py`, `seed.py`,
  `app/core/security.py`.
- **Backend features**: `app/api/v1/teacher.py`, `app/api/v1/student.py`,
  `app/api/v1/super_admin.py`, `app/api/v1/school_admin.py`, `app/schemas/school.py`,
  `app/schemas/user.py`.
- **Frontend core**: `src/App.jsx`, `src/services/api.js`, `src/context/CourseContext.jsx`,
  `src/context/SchoolContext.jsx`, `src/context/StudentProgressContext.jsx`,
  `src/components/routing/RoleRoute.jsx` (new), `src/Components/` → `src/components/`
  (case rename, ~130 files).
- **Frontend features**: `src/pages/teacher/AssignmentSubmissionsPage.jsx` (new),
  `src/pages/teacher/AssignmentsPage.jsx`, `src/pages/teacher/AnalyticsPage.jsx`,
  `src/pages/teacher/CourseDetailsPage.jsx`, `src/pages/teacher/TeacherSettingsPage.jsx`,
  `src/pages/superadmin/ActivityLogPage.jsx`, `src/pages/superadmin/PlatformDashboard.jsx`,
  `src/pages/superadmin/SubscriptionsPage.jsx`, `src/pages/admin/StudentsPage.jsx`,
  `src/pages/admin/TeachersPage.jsx`, `src/pages/admin/AdminDashboard.jsx`,
  `src/components/student/WeeklyProgressCard.jsx`, `BadgesCard.jsx`, `LeaderboardCard.jsx`,
  `src/pages/student/StudentRewardsPage.jsx`, `src/components/admin/*FormModal.jsx`,
  `src/services/schoolService.js`.
- **Deleted (dead code)**: stub `Dashboard.jsx`×3, `Login.jsx`, `ForgotPassword.jsx`,
  `Home.jsx`, `CreateCoursePage.jsx`, 4 landing components, `MainLayout.jsx`, 3 empty
  `components/forms/*` files, `PlaceholderPage.jsx`.

## 5. Database / migration changes

- **New migration**: `0003_add_assignment_type_and_config.py` — adds `assignments.type`
  and `assignments.config`. **Run `alembic upgrade head` against your real database** —
  if those columns already exist (because your dev DB was created via the app's
  `create_all` fallback rather than pure migrations), the migration will error on a
  duplicate column; tell me if that happens and I'll adjust it to be conditional.
- **`seed.py` behavior changed**: no longer creates the two fake schools/six fake users.
  Running it now just bootstraps the platform super-admin from `.env` — same effect as
  what already happens automatically on app startup. Safe to run, but it won't do
  anything new if you've already logged in as super-admin once.

## 6. Exact commands to run locally

Backend:
```
cd Backend\backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

Frontend:
```
cd Frontend
npm install
npm run dev
```

Optional one-time bootstrap (only needed if no super-admin exists yet):
```
cd Backend\backend
python seed.py
```

## 7. Deployment readiness status: **Not yet ready**

- The five greenfield modules aren't built yet.
- I verified backend logic (auth, tenant isolation, the new `ai.py` security fix, real
  analytics, grading flow) with an isolated SQLite + `TestClient` smoke test in my own
  sandbox — **27/27 checks passed** — but I could not reach your real PostgreSQL database
  or run `npm run build` against your actual machine from here (this session's Linux
  sandbox has an unrelated native-binding mismatch with your `node_modules`, which were
  installed on Windows). Please run `alembic upgrade head` and `npm run build` yourself
  before deploying, and let me know if either surfaces anything.
- Before any real deployment: set a strong, non-default `SECRET_KEY` and
  `FIRST_SUPERUSER_PASSWORD` in `.env`, and tighten `CORS_ORIGINS` (currently includes a
  wildcard `"*"` alongside specific localhost origins).

## 8. AI features that can't be fully tested until a provider API key is configured

- AI-assisted grading against an answer key (access control was verified working without
  a key — it correctly returns "AI not configured" rather than crashing).
- AI Tutor chat replies (course/lesson access control was verified working without a key,
  same as above — the reply itself needs `GEMINI_API_KEY` or a configured Claude key).
- AI course/assignment/gamified-match generation.
- AI-assisted PDF-to-course generation.

All four already degrade gracefully with a clear "AI configuration required" error when
no key is set — this was true before this session and I preserved that behavior.
