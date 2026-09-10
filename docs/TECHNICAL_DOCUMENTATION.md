# AI Learning Suite — Technical Documentation

**Generated:** August 27, 2026
**Scope:** Full end-to-end technical documentation of the codebase as it exists today, produced by direct inspection of the repository (`Backend/backend` and `Frontend`). Nothing in this document is assumed — every claim traces back to actual code, config, or migration files.

---

## 1. What This Application Is

AI Learning Suite is a multi-tenant school learning platform. Each school is an isolated tenant. A Super Admin manages schools at the platform level; a School Admin manages teachers and students within one school; Teachers build courses, lessons, assignments, quizzes, and grade student work (with AI assistance); Students join courses with a code, complete lessons, submit work, and use an AI tutor scoped to their own course content. AI features are provider-independent — each school can be configured to use Google Gemini or Anthropic Claude.

The stack is a FastAPI + PostgreSQL backend and a React (Vite) single-page frontend, talking over a versioned REST API (`/api/v1`).

---

## 2. Tech Stack

### Backend (`Backend/backend`)

| Layer | Choice | Version (from `requirements.txt`) |
|---|---|---|
| Web framework | FastAPI | 0.110.0 |
| ASGI server | uvicorn (+ gunicorn for production) | 0.28.0 / 21.2.0 |
| ORM | SQLAlchemy | 2.0.28 |
| Migrations | Alembic | 1.13.1 |
| Database driver | psycopg2-binary (PostgreSQL only) | 2.9.9 |
| Validation | Pydantic + pydantic-settings | 2.6.4 / 2.2.1 |
| Auth | PyJWT (HS256) + passlib[bcrypt] | 2.8.0 / 1.7.4 |
| File uploads | python-multipart | 0.0.9 |
| AI — Google | google-genai | 0.7.0 |
| AI — Anthropic | anthropic | 0.19.1 |
| PDF text extraction | pypdf | 4.1.0 |
| Excel export/import | openpyxl | 3.1.2 |
| PDF export | reportlab | 4.1.0 |
| Env config | python-dotenv | 1.0.1 |

There is **no automated test suite** (no pytest in dependencies). A `scratch/` folder contains ad-hoc manual QA scripts using `fastapi.testclient.TestClient` — useful for manual smoke-testing but not a CI-grade test suite.

### Frontend (`Frontend`)

| Layer | Choice | Version (from `package.json`) |
|---|---|---|
| UI framework | React + react-dom | 19.2.7 |
| Build tool | Vite (rolldown-based) + `@vitejs/plugin-react` | 8.1.1 |
| Routing | react-router-dom | 7.18.1 |
| HTTP client | axios | 1.18.1 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`, zero-config) | 4.3.3 |
| Charts | recharts | 3.10.1 |
| Icons | lucide-react, react-icons | 1.27.0 / 5.7.0 |

No TypeScript (plain JS/JSX), no component library (all UI primitives hand-built), no form library, and no state-management library (Redux/Zustand) — state is handled with React Context + hooks.

---

## 3. Repository Structure

```
AI LEARNING/
├── Backend/
│   └── backend/
│       ├── alembic/                  # migrations (env.py + versions/)
│       ├── app/
│       │   ├── main.py               # FastAPI app, CORS, startup bootstrap
│       │   ├── api/
│       │   │   ├── deps.py           # auth deps: get_current_user, get_current_school_id, require_roles
│       │   │   └── v1/               # router.py + auth.py, super_admin.py, school_admin.py, teacher.py, student.py, ai.py
│       │   ├── core/                 # config.py, database.py, security.py
│       │   ├── models/               # school.py, user.py, course.py, lms.py, platform.py
│       │   ├── schemas/              # Pydantic request/response schemas
│       │   └── services/
│       │       ├── ai_service.py, pdf_service.py
│       │       └── ai_providers/     # base.py, factory.py, gemini_provider.py, claude_provider.py
│       ├── scratch/                  # manual QA scripts (not a real test suite)
│       ├── seed.py                   # bootstraps Super Admin only — no demo data
│       ├── alembic.ini
│       └── requirements.txt
└── Frontend/
    └── src/
        ├── App.jsx, main.jsx          # routes, role-gating, entry point
        ├── components/                # admin/, auth/, common/, dashboard/, layout/, routing/, student/, superadmin/, table/, teacher/, tutor/, ui/
        ├── config/navigation.js       # sidebar nav per role
        ├── context/                   # AuthContext, CourseContext, SchoolContext, StudentProgressContext, TutorChatContext
        ├── hooks/                     # useAuth, useDataTable
        ├── layouts/                   # AuthLayout, DashboardLayout
        ├── pages/                     # admin/, auth/, student/, superadmin/, teacher/
        ├── services/                  # api.js + authService, schoolService, aiCourseBuilderService, pdfCourseGenService, tutorAIService, aiService
        └── utils/                     # formatDate, generateCredentials, generateId, mockAuthToken, validators
```

---

## 4. Backend Architecture

### 4.1 App wiring (`app/main.py`)

- `FastAPI(title=settings.PROJECT_NAME, openapi_url=f"{API_V1_STR}/openapi.json")`, with the whole `api_router` mounted at `settings.API_V1_STR` (default `/api/v1`).
- `Base.metadata.create_all(bind=engine)` runs at import time (wrapped in try/except) **in addition to** Alembic migrations — this is a redundant-but-harmless belt-and-suspenders pattern, not a replacement for running `alembic upgrade head`.
- CORS via `CORSMiddleware` — `allow_credentials=True` with `allow_methods=["*"]`/`allow_headers=["*"]`. The **code default** for `CORS_ORIGINS` includes `"*"`, which combined with `allow_credentials=True` is invalid per the CORS spec (browsers reject it). The real `.env` overrides this with explicit origins, so it isn't live today — but the default should be fixed so a future deploy without an explicit `.env` value doesn't silently break cross-origin auth.
- `@app.on_event("startup")` bootstraps exactly one Super Admin account (idempotent) from `FIRST_SUPERUSER` / `FIRST_SUPERUSER_PASSWORD`.
- `GET /` and `GET /health` are unauthenticated liveness endpoints.

### 4.2 Multi-tenancy model

Nearly every table carries a `school_id` foreign key to `schools.id` (`ON DELETE CASCADE`). Tenant isolation is enforced **server-side only**, via the `get_current_school_id()` FastAPI dependency:

- Super Admin → returns `None` (cross-school access).
- Every other role → returns `current_user.school_id`, read from the authenticated user's own DB row (derived from the JWT `sub`), **never accepted as a client-supplied parameter**. Every school-scoped query in `school_admin.py`, `teacher.py`, `student.py`, and `ai.py` filters through this value.

Course "golden templates" use `school_id = NULL` as a sentinel meaning "platform-level, shared by all schools" — Teachers can browse and adopt (deep-clone) these into their own school via `POST /teacher/adopt-template/{template_id}`, which never mutates the source template.

### 4.3 Authentication & authorization

- Passwords hashed with `passlib` (`bcrypt`). *(Note: `security.py` includes a monkeypatch adding a fake `bcrypt.__about__` attribute — a known compatibility shim for `passlib>=1.7.4` + `bcrypt>=4.1`.)*
- JWT (HS256, `PyJWT`), signed with `SECRET_KEY`, default 24-hour expiry. Payload: `{exp, sub: user_id, role, school_id}`.
- `POST /api/v1/auth/login` is the only login route; there is **no register, refresh, logout, forgot-password, or reset-password endpoint**. Accounts are created only by a Super Admin (creating a School + optional Admin), a School Admin (creating Teachers/Students, or bulk Excel upload), with auto-generated temporary passwords (`<Name>@<4digits>`).
- `require_roles([...])` is a dependency factory mounted at the router level (e.g. `super_admin.py` → `SUPER_ADMIN` only, `teacher.py` → `TEACHER`+`ADMIN`) or per-endpoint (`ai.py` uses `TEACHING_ROLES` and `TUTOR_ROLES` sets).
- **Role naming note:** the spec's "School Admin" role is implemented in code as the enum value `ADMIN` (`UserRole.ADMIN`), not `SCHOOL_ADMIN`. Four roles exist: `SUPER_ADMIN`, `ADMIN`, `TEACHER`, `STUDENT`.

### 4.4 Database schema

All primary keys are string UUIDs (`uuid.uuid4()`), SQLAlchemy 2.0 declarative models.

| Table | Key fields | Notes |
|---|---|---|
| `schools` | id, name, domain (unique), is_active, **ai_provider** (default `"gemini"`), created_at, updated_at | `ai_provider` is the per-school AI configuration switch |
| `users` | id, email (unique), hashed_password, full_name, role (enum), school_id (nullable FK), grade_id (nullable FK), section, is_active | `school_id` is NULL only for Super Admin |
| `courses` | id, school_id (nullable = golden template), join_code (unique, auto-generated), title, description, subject, grade_level, language, difficulty, is_published, is_golden_template, origin_template_id (self-FK), created_by_id | join_code is what students use to enroll |
| `modules` | id, course_id (CASCADE), title, description, order | |
| `lessons` | id, module_id (CASCADE), title, content, summary, duration_minutes, order, activities (JSON), homework (JSON), quiz (JSON) | quiz answers are sent to the client — see §9 |
| `grades` | id, school_id (CASCADE), name, code | school's class/grade groupings |
| `enrollments` | id, school_id, student_id (FK, CASCADE), course_id (FK, CASCADE), status, enrolled_at | |
| `lesson_progress` | id, school_id, student_id, lesson_id, course_id, is_completed, completed_at | |
| `assignments` | id, school_id, course_id, lesson_id (nullable), title, description, due_date, max_points, answer_key, target_type/grade/section, **type** (Quiz/Homework/Project/Gamified Match), **config** (JSON) | `type`/`config` were added late — see §9 |
| `submissions` | id, school_id, assignment_id, student_id, content, file_url, grade_points, feedback, submitted_at | |
| `student_stats` | id, school_id, student_id (unique, 1:1), xp, streak_days, last_active_date, badges (JSON) | |
| `evaluation_games` | id, school_id, course_id, lesson_id (nullable), title, game_type, config (JSON), is_published | **defined but never instantiated anywhere in the code** — see §9 |
| `game_results` | id, school_id, game_id, student_id, score, completed_at | tied to the unused `evaluation_games` table |
| `subscriptions` | id, school_id (unique, 1:1), plan (Starter/Professional/Enterprise/Standard), status, start_date, end_date | |
| `activity_logs` | id, school_id (nullable = platform-level), user_id (nullable), user_name, action, details, timestamp | audit trail feeding both Super Admin and School Admin activity pages |

### 4.5 API Reference

All paths are relative to `/api/v1`.

**Auth** (`auth.py`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/login` | none | Login, issues JWT |
| GET | `/auth/me` | any authenticated user | Current user info |

**Super Admin** (`super_admin.py` — role `SUPER_ADMIN` only)

| Method | Path | Purpose |
|---|---|---|
| POST | `/super-admin/schools` | Create school (+ optional admin), creates default Subscription |
| GET | `/super-admin/schools` | List all schools with computed counts |
| GET | `/super-admin/schools/{school_id}` | School detail |
| PUT | `/super-admin/schools/{school_id}` | Update school (name/domain/active/ai_provider/admin creds/plan) |
| POST | `/super-admin/schools/{school_id}/suspend` | Suspend school |
| POST | `/super-admin/schools/{school_id}/activate` | Activate school |
| DELETE | `/super-admin/schools/{school_id}` | Delete school |
| GET | `/super-admin/stats` | Platform-wide counts |
| GET | `/super-admin/activity-logs` | Last 100 platform activity logs |
| GET | `/super-admin/golden-templates` | List golden templates |
| POST | `/super-admin/golden-templates` | Create golden template course (nested modules/lessons) |
| GET | `/super-admin/subscriptions` | All subscriptions, joined with school name |
| PUT | `/super-admin/subscriptions/{school_id}` | Upsert subscription plan/status/end_date |

**School Admin** (`school_admin.py` — role `ADMIN` only)

| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/school-admin/teachers` | List / create teachers |
| PUT/DELETE | `/school-admin/teachers/{id}` | Update / delete teacher |
| GET/POST | `/school-admin/students` | List / create students |
| PUT/DELETE | `/school-admin/students/{id}` | Update / delete student |
| GET/POST | `/school-admin/grades` | List / create grades |
| DELETE | `/school-admin/grades/{id}` | Delete grade |
| GET | `/school-admin/stats` | Teacher/student/course/grade counts |
| GET | `/school-admin/activity-logs` | This school's activity log |
| GET | `/school-admin/students/excel-template` | Download blank bulk-upload template |
| POST | `/school-admin/students/upload-excel` | Bulk-create students from `.xlsx` |
| PUT | `/school-admin/settings/school` | Update school name/domain |
| PUT | `/school-admin/settings/profile` | Update own admin profile |
| POST | `/school-admin/settings/change-password` | Self password change |

**Teacher** (`teacher.py` — role `TEACHER` or `ADMIN`)

| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/teacher/courses` | List / create courses |
| GET/PUT/DELETE | `/teacher/courses/{id}` | Read / update / delete course |
| POST | `/teacher/courses/{id}/publish` | Toggle publish state |
| POST/PUT/DELETE | `/teacher/courses/{cid}/modules[/{mid}]` | Module CRUD |
| POST/PUT/DELETE | `/teacher/courses/{cid}/modules/{mid}/lessons[/{lid}]` | Lesson CRUD |
| GET/POST | `/teacher/assignments` | List / create assignments |
| PUT/DELETE | `/teacher/assignments/{id}` | Update / delete assignment |
| POST | `/teacher/assignments/extract-answer-key-pdf` | Extract raw text from an uploaded PDF (no AI) |
| GET | `/teacher/assignments/{id}/submissions` | List submissions for an assignment |
| POST | `/teacher/submissions/{id}/grade` | Manually set grade/feedback |
| GET | `/teacher/golden-templates` | Browse adoptable golden templates |
| POST | `/teacher/adopt-template/{template_id}` | Deep-clone a golden template into the teacher's school |
| GET | `/teacher/students` | Roster with stats |
| GET | `/teacher/courses/{id}/students` | Per-course roster |
| GET | `/teacher/analytics` | Course/student/assignment/submission counts + real completion rate |
| GET | `/teacher/grades/export/excel` | Gradebook export (.xlsx) |
| GET | `/teacher/grades/export/pdf` | Gradebook export (.pdf) |
| PUT | `/teacher/settings/profile` | Update profile |
| POST | `/teacher/settings/change-password` | Self password change |

**Student** (`student.py` — role `STUDENT` only)

| Method | Path | Purpose |
|---|---|---|
| GET | `/student/enrolled-courses` | Published courses the student is enrolled in |
| POST | `/student/join-course` | Join by join_code |
| GET | `/student/courses/{id}` | Course detail (must be enrolled + published) |
| POST | `/student/lessons/{id}/complete` | Mark lesson complete (+50 XP, +1 streak) |
| GET | `/student/stats` | XP / streak / badges |
| GET | `/student/assignments` | Assignments with computed status |
| GET | `/student/profile` | Full profile + academic stats |
| POST | `/student/change-password` | Self password change |
| POST | `/student/assignments/{id}/submit` | Create/update a submission (+50 XP) |
| GET | `/student/games` | Published games for enrolled courses — **always empty, see §9** |
| POST | `/student/games/{id}/submit` | Record a game result — **effectively unreachable, see §9** |
| GET | `/student/leaderboard` | Top-10 by XP in the student's school + caller's rank |

**AI** (`ai.py`, prefix `/ai`)

| Method | Path | Roles | Purpose |
|---|---|---|---|
| POST | `/ai/generate-course` | Teacher/Admin | AI-generate a full course structure |
| POST | `/ai/generate-assignment` | Teacher/Admin | AI-generate assignment title/description |
| POST | `/ai/generate-gamified-match` | Teacher/Admin | AI-generate match-the-pairs content (returned, not auto-persisted) |
| POST | `/ai/generate-course-from-pdf` | Teacher/Admin | Upload PDF → extract text → AI structures a course |
| POST | `/ai/tutor-chat` | Student/Teacher/Admin | AI tutor, grounded in the caller's actual enrolled course/lesson content |
| POST | `/ai/grade-submission-with-answer-key` | Teacher/Admin | AI compares a submission against an answer key, returns a suggested grade (advisory — teacher still commits via the grade endpoint) |

### 4.6 AI provider integration

This is genuinely provider-independent and configurable per school, matching the project's design goal:

- `School.ai_provider` (default `"gemini"`) is set by a Super Admin at school creation/update.
- Every AI endpoint reads `current_user.school.ai_provider` and passes it through `AIService._get_provider()` → `get_ai_provider()` (factory), which maps `"claude"/"anthropic"` → `ClaudeAIProvider`, anything else → `GeminiAIProvider` (providers are cached singletons).
- `BaseAIProvider` is an abstract base both providers implement identically: `generate_course_structure`, `generate_assignment`, `tutor_chat`, `generate_course_from_pdf`, `grade_submission`, `generate_gamified_match`.
- `GeminiAIProvider` (`google-genai` SDK) retries across a fallback list of models if the configured one fails. `ClaudeAIProvider` (`anthropic` SDK) uses `CLAUDE_MODEL` (default `claude-3-5-sonnet-20241022`).
- If a provider's API key is unconfigured, the app raises `HTTPException(503, ...)` with a clear message — **it never falls back to mock or fake AI output.**
- In the current `.env`, only `GEMINI_API_KEY` is set; `CLAUDE_API_KEY` is not, so any school configured to use Claude will currently get a 503 until that key is added.

### 4.7 Exports & file handling

| Feature | Endpoint | Implementation |
|---|---|---|
| Gradebook export (Excel) | `GET /teacher/grades/export/excel` | `openpyxl`, styled, streamed |
| Gradebook export (PDF) | `GET /teacher/grades/export/pdf` | `reportlab`, landscape table, streamed |
| Bulk student template | `GET /school-admin/students/excel-template` | `openpyxl`, blank styled template |
| Bulk student import | `POST /school-admin/students/upload-excel` | `openpyxl`, fuzzy header matching, auto-creates Grades, auto-generates emails/passwords |
| PDF → course/lesson (AI) | `POST /ai/generate-course-from-pdf` | `pypdf` extracts text, then sent to the configured AI provider |
| PDF → answer key (no AI) | `POST /teacher/assignments/extract-answer-key-pdf` | `pypdf`, raw text extraction only |
| AI grading vs. answer key | `POST /ai/grade-submission-with-answer-key` | Accepts pasted text or PDF |

---

## 5. Frontend Architecture

### 5.1 Routing (`src/App.jsx`)

All authenticated routes render inside a single `<DashboardLayout>`; access is gated by `<RoleRoute allow={[...]}>`, which reads the role from `AuthContext` and redirects mismatched roles to their own dashboard. The code explicitly documents that this is a UX guard only — **the backend independently re-enforces every boundary**, matching the server-side design in §4.3.

| Role | Routes |
|---|---|
| Super Admin | `/super-admin/dashboard`, `/schools`, `/schools/:schoolId`, `/subscriptions`, `/platform-settings`, `/activity` |
| School Admin | `/admin/dashboard`, `/teachers`, `/students`, `/grades`, `/reports`, `/settings` |
| Teacher | `/teacher/dashboard`, `/courses`, `/courses/create`, `/courses/:id/edit`, `/courses/:id`, `/ai-course-builder`, `/assignments`, `/assignments/:id/submissions`, `/students`, `/analytics`, `/settings` |
| Student | `/student/dashboard`, `/courses`, `/courses/:id/learn`, `/ai-tutor`, `/assignments`, `/rewards`, `/profile` |

Roles are normalized to lowercase (`super_admin`, `admin`, `teacher`, `student`) once, at login, from the backend's uppercase enum.

**Known navigation gap:** `/teacher/settings` has no entry in the sidebar nav config for the teacher role and isn't linked from the header either — reachable only by typing the URL directly.

### 5.2 Backend communication

- `src/services/api.js` — single axios instance, base URL from `VITE_API_BASE_URL` (default `http://localhost:8000/api/v1`).
- Auth token stored in `localStorage` under **two parallel key sets** (`token`/`user` and `ails_token`/`ails_auth_user`) — apparent legacy duplication between an older context-only flow and the newer service-based flow. A request interceptor attaches `Authorization: Bearer <token>`; there is **no response interceptor**, so an expired/invalid token doesn't trigger an automatic logout/redirect.
- Typed API groups: `authAPI`, `superAdminAPI`, `schoolAdminAPI`, `teacherAPI`, `studentAPI`, `aiAPI`. Uploads use `FormData`; exports use `responseType: 'blob'`.

### 5.3 State management

Pure React Context + hooks (no Redux/Zustand/React Query): `AuthContext`, `SchoolContext`, `CourseContext`, `StudentProgressContext`, `TutorChatContext`. Each fetches on mount and exposes state via a `use*` hook; local UI state (forms, modals, pagination) uses `useState` plus a shared `useDataTable` hook for client-side search/filter/sort/paginate.

### 5.4 Styling

Tailwind CSS v4, zero-config (no `tailwind.config.js`), consistent indigo/slate palette by convention, no external component library — all primitives are hand-built.

---

## 6. Setup & Running Locally

### Backend

1. `cd Backend/backend`, create/activate a Python venv, `pip install -r requirements.txt`.
2. Provide a `.env` file (no `.env.example` exists in the repo today — recommended to add one; see §7 for the full variable list).
3. `alembic upgrade head` to create/update schema (also auto-created on app import as a fallback, but Alembic is the source of truth).
4. Run `python seed.py` once to bootstrap the Super Admin account (uses `FIRST_SUPERUSER`/`FIRST_SUPERUSER_PASSWORD`, or code defaults if unset — see §7 for the security note).
5. `uvicorn app.main:app --reload` for development, or `gunicorn` for production.

### Frontend

1. `cd Frontend`, `npm install`.
2. Set `VITE_API_BASE_URL` (an `.env` file — defaults to `http://localhost:8000/api/v1` if omitted).
3. `npm run dev` for development, `npm run build` for a production bundle (Vite/rolldown).

---

## 7. Configuration Reference (environment variables)

| Variable | Purpose | Set in the current `.env`? |
|---|---|---|
| `PROJECT_NAME` | API title / health check name | yes |
| `API_V1_STR` | URL prefix (default `/api/v1`) | yes |
| `SECRET_KEY` | JWT signing secret | yes — **secret, keep out of docs/version control** |
| `ALGORITHM` | JWT algorithm (default HS256) | yes |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT lifetime | yes |
| `DATABASE_URL` | PostgreSQL connection string | yes — **secret** |
| `CORS_ORIGINS` | Allowed origins | yes |
| `GEMINI_API_KEY` | Google Gemini key | yes — **secret** |
| `GEMINI_MODEL` | Gemini model id | no (code default `gemini-3.1-flash-lite`) |
| `CLAUDE_API_KEY` | Anthropic key | **no — Claude provider is currently non-functional until this is set** |
| `CLAUDE_MODEL` | Claude model id | no (code default `claude-3-5-sonnet-20241022`) |
| `DEFAULT_AI_PROVIDER` | Platform-level fallback provider | no (code default `"gemini"`) |
| `FIRST_SUPERUSER` / `FIRST_SUPERUSER_PASSWORD` | Bootstrap Super Admin credentials | **no — running on code defaults (`superadmin@system.com` / `password123`). Change this before any real deployment.** |
| `VITE_API_BASE_URL` (frontend) | API base URL | not set — defaults to `http://localhost:8000/api/v1` |

**Recommendation:** add a `.env.example` with all of the above (names only) to ease onboarding, and set `FIRST_SUPERUSER_PASSWORD` explicitly before any non-local deployment.

---

## 8. Known Issues, Gaps & Technical Debt

This section is a direct, code-verified account of what is incomplete, inconsistent, or not yet wired to real data. It is intended to guide the next round of work, not as a criticism of what's built — the core platform (auth, multi-tenancy, course/lesson/assignment CRUD, AI generation, grading, exports) is real and functional.

### 8.1 Backend

1. **Two parallel, half-built systems for "games."** `EvaluationGame`/`GameResult` tables exist and have working CRUD-adjacent endpoints (`GET /student/games`, `POST /student/games/{id}/submit`), but nothing in the codebase ever creates an `EvaluationGame` row — these endpoints will always return empty / 404. Meanwhile `POST /ai/generate-gamified-match` generates real match-the-pairs content but returns it to the caller without persisting it anywhere; `Assignment.type = "Gamified Match"` with the `Assignment.config` JSON column appears to be the actually-used storage path (the frontend's Gamified Match UI is built against assignments, not the `evaluation_games` table). **Recommendation:** deprecate/remove the unused `EvaluationGame`/`GameResult` tables and endpoints, or finish wiring them — right now they're dead code that could confuse future maintainers.
2. **Migration/model drift already occurred once.** Migration `0003_add_assignment_type_and_config.py` documents in its own comment that `Assignment.type`/`Assignment.config` existed on the ORM model and were used by the create-assignment route before any migration added the columns — meaning a fresh database provisioned via `alembic upgrade head` alone would have been missing them until this migration was written. Worth a process note: always pair a new model field with a migration in the same change.
3. **CORS default is spec-invalid** (`allow_origins` defaulting to include `"*"` combined with `allow_credentials=True`). Not live today because `.env` overrides it, but the code default should be corrected.
4. **Default Super Admin credentials are live via code fallback** (`superadmin@system.com` / `password123`) since `FIRST_SUPERUSER`/`FIRST_SUPERUSER_PASSWORD` aren't set in `.env`. Must be set explicitly before any real deployment.
5. **No `.env.example`** in the repo — onboarding a new environment currently requires reading `config.py` to discover every variable.
6. **Claude provider is currently non-functional** in this environment (no `CLAUDE_API_KEY` configured) even though the code fully supports it — any school set to `ai_provider="claude"` will get a clear 503, not silent failure, but it won't work until a key is added.
7. `tenant_test.db` (a leftover SQLite file) and `scratch/` manual test scripts sit in the backend root — harmless but unused clutter; not referenced by the running app.
8. No automated test suite exists.

### 8.2 Frontend

1. **Fabricated notification content shown to every user.** `NotificationIcon.jsx` hardcodes three fake notifications (including an invented student name and activity) and displays them in the header bell for every role — there is no backend notifications API. This is the most visible instance of non-real data in the running app and should be prioritized, since it directly conflicts with the "no mock/demo data" requirement for this project.
2. **Systemic silent-fallback-on-error pattern.** Multiple context mutations (`CourseContext.addCourse/addModule/addAssignment/importTemplate`, `SchoolContext.addGoldenTemplate`, and the create handlers in `TeachersPage`, `StudentsPage`, `GradesPage`) catch a failed API call and fabricate a plausible local record instead of surfacing an error — meaning a failed save can render in the UI as if it succeeded, with no user-visible failure. This should be replaced with real error handling (toast/error state) before it causes a support incident.
3. **Hardcoded placeholder values presented as real saved data:** `AdminSettingsPage` (phone/address defaults), `TeacherSettingsPage` (subject default), `StudentProfilePage` (grade/section/school fallback) all show fabricated defaults instead of fetching real saved values first.
4. **Hardcoded, mutually inconsistent badge catalogs** in two places (`BadgesCard.jsx` vs `StudentRewardsPage.jsx`) — neither is fetched from the backend, and they don't even agree with each other. One entry ("Kinematics Novice") reads as leftover physics-specific demo content in an otherwise generic platform.
5. **Permanently-zero metrics that read as broken:** `studentsEnrolled` (course cards, analytics chart), `aiUsageCount` (Super Admin dashboard), and lesson `completed` state on initial load are all hardcoded to `0`/`false` in the relevant contexts rather than fetched — real data exists in the backend (enrollments, lesson_progress) but the frontend isn't wired to pull it.
6. **Super Admin → School Details page**: Teachers, Students, and Courses tabs always render an empty array — no fetch is wired up for any of the three.
7. **Dead UI:** profile-dropdown "My Profile"/"Account Settings" menu items do nothing; "Forgot password?" and "Contact your administrator" links on the login page go nowhere; the header search bar accepts input but has no handler; the "Remember me" login checkbox has no effect (the handler that would use it only accepts one argument).
8. **Quiz answers are sent to the client** and checked client-side in the Course Player — a real security consideration (a student can read the correct answers from the network payload / DOM), separate from the mock-data issues above.
9. Minor repo hygiene: a stale `build_errors.txt` from a previously-fixed build break, a duplicate `package-lock (1).json`, and a `dist/` folder are all still sitting in the Frontend root.

---

## 9. Appendix: Roles Reference

| Backend enum value | Frontend role string | Common name |
|---|---|---|
| `SUPER_ADMIN` | `super_admin` | Super Admin (platform) |
| `ADMIN` | `admin` | School Admin |
| `TEACHER` | `teacher` | Teacher |
| `STUDENT` | `student` | Student |

*(Document generated from direct source inspection on 2026-08-27. Re-generate after significant changes to keep it accurate.)*
