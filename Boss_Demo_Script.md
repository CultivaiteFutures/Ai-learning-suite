# AI Learning Suite — Executive Demo Script

*A spoken walkthrough script for presenting the platform live. Cues for what to click are in [brackets]; the surrounding text is meant to be said out loud, in your own words, adapted as you go.*

---

## Opening (30–60 seconds)

"I want to walk you through AI Learning Suite end to end — not just the features, but how it's actually built underneath, since you asked for the full picture.

At a high level, this is a multi-tenant K-12 learning management system. 'Multi-tenant' means one single deployment of this application serves multiple schools, and the data is completely partitioned per school at the database and API layer — a teacher or admin at School A can never see a row of data belonging to School B, even by guessing an ID. I'll show you exactly how that's enforced, not just tell you.

There are five distinct user roles, each with their own dashboard and permission boundary: Super Admin, School Admin, Teacher, Student, and — as of this latest round of work — Parent/Guardian. I'll go through each one, and along the way I'll point out the architecture decisions behind what you're seeing."

---

## Part 1: Architecture Overview (do this before touching the UI)

"Before I click anything, let me give you the technical shape of this system, because it'll make everything else make sense.

**Backend:** Python, FastAPI, SQLAlchemy as the ORM, PostgreSQL as the database, Alembic for schema migrations. FastAPI gives us automatic OpenAPI/Swagger documentation for free, and async-capable request handling, though most of our routes are synchronous SQLAlchemy calls right now since our read/write volume doesn't need async yet.

**Frontend:** React 19, built with Vite, React Router v7 for client-side routing, Tailwind CSS for styling. It's a single-page application — one page load, then everything after that is client-side navigation and API calls.

**Authentication:** Stateless JWT bearer tokens. A user logs in against `/auth/login`, gets back a signed token with a 24-hour expiry, and every subsequent request carries that token in an `Authorization: Bearer` header. There's no server-side session store — the token itself, decoded and verified against our `SECRET_KEY`, is the source of truth for who's making the request.

**Authorization — this is the part I want you to really see:** every protected endpoint declares up front exactly which roles can call it, using a dependency-injection pattern — `require_roles([UserRole.TEACHER, UserRole.ADMIN])`, for example. FastAPI runs that check before your route handler code even executes. So it's not 'if user.role == teacher, allow it' scattered through business logic — it's declared once, centrally, per-endpoint, and it's impossible to forget.

**Multi-tenancy — the other half of the security model:** almost every table in this database has a `school_id` column. Every query is filtered by it. And critically, that `school_id` is *never* trusted from the frontend request — it's derived server-side from the authenticated user's own JWT-decoded identity, through a dependency called `get_current_school_id`. So even if someone tampered with a request and tried to pass a different school's ID in the payload, the backend ignores it and uses the school ID baked into their own login token. Super Admin is the one exception — that role operates across all schools by design, since it's the platform operator.

**Data model, briefly:** Schools, Users (with a role column: SUPER_ADMIN, ADMIN, TEACHER, STUDENT, PARENT), Courses, Modules, Lessons, Assignments, Submissions, Enrollments, Grades — that's the academic core. Then there's a second layer for engagement: StudentStats (XP, streaks, badges), Challenges, EvaluationGames, CreativeProjects. And a third layer for communication: Announcements, Discussions, CalendarEvents, Notifications. I'll show you all of these as we go.

One convention worth knowing: the database and Python models use snake_case — `school_id`, `is_active`, `grade_points` — but the frontend is all camelCase JavaScript convention — `schoolId`, `isActive`, `gradePoints`. We bridge that with a Pydantic base schema that auto-converts field names in both directions, so neither side has to think about it."

---

## Part 2: Super Admin — the platform operator's view

[Log in as Super Admin]

"This is the view for us — the people running the platform itself, across every school that uses it.

[Platform Dashboard] This is the top-level dashboard: total schools, total students and teachers platform-wide, monthly active users, and recent activity.

[Schools] Here's the full list of schools on the platform. I can onboard a new school right from here — [open the Add School form] — name, domain, subscription plan. When I create a school, the backend automatically seeds a full Kindergarten-through-Grade-12 set of grade levels for it — thirteen grade rows, ready to go, no manual setup needed on the school's end.

[Click into a school] Each school has its own detail page — admin contact, enrollment counts, subscription status.

[Subscriptions] This is billing-plan management — Starter, Professional, Enterprise tiers per school, with status tracking (active, inactive, canceled).

[Platform Settings] Global configuration for the platform.

[Activity Logs] An audit trail — every significant action across every school gets logged here: who did what, when. This is generic — any school-scoped action, or a platform-level action for Super Admin, writes into the same `ActivityLog` table with a `school_id` that's nullable specifically for platform-level events.

One more thing worth mentioning here: Golden Source Templates. Super Admin can build a course once, mark it as a template — that's a Course row with `school_id` set to NULL and `is_golden_template` true — and then any school can clone it into their own catalog. That's how we can seed high-quality courses across the whole platform without every school building from scratch."

---

## Part 3: School Admin — running a single school

[Log out, log in as a School Admin]

"Now I'm a School Admin — this role is scoped entirely to one school. Everything from here forward is filtered by that `school_id` I mentioned.

[Dashboard] Total teachers, total students, grade-level breakdown, recently added staff.

[Teachers] Full CRUD on teacher accounts. [Add Teacher] I can create an account directly — if I leave the password field blank, the backend generates a secure temporary password and shows it to me once, so I can hand it to the teacher.

[Students] Same pattern for students, plus — [point out the Excel upload button] — bulk import via spreadsheet, for onboarding an entire roster at once instead of one-by-one.

[Grades] This is the grade-level structure for the school — and this is one of the three things we just finished building. It used to run Grade 6 through 12 only. Real US K-12 schools obviously need the full range, so this now runs Kindergarten through Grade 12. [Point out the K-5 rows] Grade levels aren't hardcoded in this app, by design — each one is just a row in a `grades` table scoped to the school, so a school can even go beyond standard K-12 if they need to. For every *existing* school that only had the old 6–12 range, we ran a one-time data migration that backfilled Kindergarten through Grade 5 automatically — nobody had to do manual data entry.

[Parents — new page] This is the second thing we just built. Real US families expect to check their kids' grades — think PowerSchool, Infinite Campus — that's table stakes for a K-12 product, and this app had zero parent-facing anything before. So now there's a full Parent/Guardian role.

[Click Add Parent] From here I create a parent account and multi-select which student or students they're linked to — a parent can have multiple kids, and importantly a kid can have multiple parents linked to them, so we modeled this as a proper many-to-many join table, `parent_student_links`, not a single foreign key. [Search and select a student, submit] Same auto-generated-password pattern as teachers and students.

[Point at the resulting table row] And you can see right in this table which children each parent account is linked to — full transparency for the admin.

I want to be precise about the security model here, because it matters: every single parent-facing API endpoint checks that link table before returning anything. A parent hitting `/parent/children/{some-id}/assignments` with a student ID they are *not* linked to gets a 404, not their real sibling's data by mistake, not an error that leaks whether that ID even exists — just 'no linked child with this id.' I verified this myself by testing it directly.

[Reports] Aggregate performance reporting.

[Announcements] School-wide announcement broadcasting.

[Challenges] Admin-level view into gamified challenges running across the school.

[Learning Community] A cross-classroom feed.

[Academic Calendar] School-wide calendar — holidays, exams, deadlines.

[Settings] School profile configuration — name, domain, contact info."

---

## Part 4: Teacher — the primary content-creation and grading role

[Log out, log in as a Teacher]

"This is where the bulk of day-to-day usage happens.

[Dashboard] At-a-glance: courses, students, pending grading.

[My Courses] Every course this teacher owns or teaches.

[Create Course] I can build a course three ways: fully manual — title, subject, modules, lessons, one at a time — [Create → AI Course Builder] AI-assisted, where I describe the course and our AI service generates a full module and lesson structure for me to review and edit, or — [AI Course Builder → PDF upload] — hand it an existing PDF, like a textbook chapter or an existing worksheet, and it extracts the content and builds a course draft from that.

On the AI side specifically: we built a provider-abstraction layer, so the actual model call goes through a common interface, and under the hood it can route to either Google Gemini or Anthropic Claude — configurable per school, defaulting to Gemini. That same AI service backs course generation, assignment generation, an AI tutor chat for students, an AI teaching assistant chat for teachers, AI-suggested grades on submissions, and creative-writing prompt generation. One service, multiple call sites.

[Open a course, into a module] Inside a course: modules containing lessons. Two scheduling features live here — [point out a module's release date] a module can have a future publish date, so it stays hidden from students until that date arrives, and — [point out prerequisite] a module can require another module in the same course be completed first, which locks it for students who haven't gotten there yet.

[Assignments] Full assignment management. When creating one, I set a type — Quiz, Homework, Project, or Gamified Match — a due date, max points, and I can target it at the whole class, a specific grade, or a specific section rather than just blasting every assignment to everyone.

For Quiz-type assignments specifically, we support real auto-grading — the teacher defines correct answers up front, a student's multiple-choice or true/false responses get scored instantly against that answer key the moment they submit, no manual grading pass required.

[Assignments → Submissions list] This is where I review what's come in. [Point out a submission with the paperclip/Attached file indicator] — this is the third thing we just added: students can now attach a photo or PDF of their work, not just typed text. That indicator right there tells me at a glance which submissions have a file attached, without opening each one.

[Click into a submission → Grade Submission page] Here's the actual grading interface: the student's typed answer, a link to view their attached file if there is one, a grade field, and an 'AI Suggest Grade' button that runs the submission against the assignment's answer key through our AI service and proposes a score and feedback for me to review and accept or override.

On the file-upload piece specifically, since you're technical: there wasn't any file-storage mechanism in this app before — earlier 'PDF upload' features only ever extracted text into memory and never persisted the actual file. We built that from scratch this round: a dedicated upload endpoint validates file type — JPG, PNG, WEBP, HEIC, or PDF — and size, caps it at 10 megabytes, writes it to disk under the backend's own uploads directory with a collision-proof filename, and we mount that directory as static files at a `/uploads` URL path. Today that's local disk, which is fine for a single-instance deployment; if this ever needs to scale horizontally across multiple backend instances, that's the one piece that would move to object storage like S3, and the URL shape the frontend already talks to wouldn't need to change at all.

[Students] Full roster with performance visibility.

[Analytics] Aggregate performance data across this teacher's classes.

[Announcements, Discussions] Course-scoped and school-scoped communication tools — discussions support threaded replies and a resolved/unresolved flag, similar to how a forum thread gets marked answered.

[Academic Calendar] Teacher's view of the school calendar, plus the ability to add class-specific events.

[Reports] Teacher-level reporting.

[AI Teaching Assistant] A dedicated chat interface for the teacher to ask the AI for help — lesson ideas, rewording an explanation, generating practice problems — separate from the student-facing tutor.

[Challenges] Teachers can create their own challenges — daily, weekly, monthly, subject-specific, class-specific, or school-wide — optionally tied to a specific assignment or game as an auto-scored target, with a bonus XP reward and an optional badge for completing it.

[Manage Games] Lightweight gamified evaluation activities — quiz-match, trivia, flashcards, memory, matching, or puzzle formats — that a teacher can attach to a lesson.

[Creative Submissions] Where a teacher reviews student work submitted through the Creative Lab — stories, posters, presentations, code — and leaves feedback.

[Learning Community] Teacher's view of the cross-classroom feed."

---

## Part 5: Student — the primary daily-use role

[Log out, log in as a Student]

"This is the experience most users of this platform actually have day to day.

[Dashboard] A join-by-code box right up top — a student types a 6-character code from their teacher and immediately gets enrolled in that course. Below that: a daily study-minutes goal with progress, an XP and level display, a 'continue learning' card for whatever course they were last in, their enrolled courses, a weekly progress chart, upcoming assignments, a leaderboard, and earned badges.

The gamification layer here — XP, level, streak days, badges — is backed by a `StudentStats` row per student, and it's fed by real activity: completing lessons, submitting assignments, winning challenges.

[My Courses] Everything they're enrolled in.

[AI Tutor] A conversational AI chat scoped to their coursework — same underlying AI service as the teacher tools, different prompt context.

[Assignments] Here's the one I really want to show you. [Open an ungraded assignment] Text answer field, and — [point at the new section] — 'Attach a Photo or PDF of Your Work.' This is the feature we just built, and the reasoning is straightforward: a huge amount of real K-12 math and science homework is 'show your work on paper' — you can't type out a hand-drawn graph or worked-out algebra steps as text. Before this, a student physically could not submit that kind of work through this app at all. [Attach a file, show the filename chip] Now they can attach it alongside or instead of typed text — we relaxed the validation so it's file-or-text-or-both, not text-required. [Submit] That file uploads first, then the submission is created referencing its URL.

[Rewards] The full gamification detail view — level progress, badge collection.

[Profile] Account settings.

[Announcements, Discussions, Academic Calendar] Student-facing versions of the same communication tools.

[Challenges] Students browse active challenges and join them — a leaderboard tracks standings per challenge, and completing the target action awards the bonus XP automatically.

[Fun Games] The student-facing play surface for the evaluation games teachers set up.

[Creative Lab] A student can ask the AI for a creative writing or project prompt, then submit their own work — a story, a poster concept, a presentation outline, even code — mark it AI-assisted or not, and optionally share it to a Learning Community feed where other students and teachers can see it.

[Learning Community] The shared cross-classroom feed itself."

---

## Part 6: Parent/Guardian — the newest role

[Log out, log in as the parent account created earlier]

"And finally, the role that didn't exist at all before this round of work.

[Dashboard — 'My Children'] Every student account linked to this parent, pulled from that `parent_student_links` table I mentioned. [Click into a child]

[Child detail page] This is deliberately read-only — no edit buttons, no submit actions, this role can't touch anything. Enrolled course count, total assignments, an average-grade calculation, experience points — then the actual course list, and below that, every assignment for this specific child with its status, due date, teacher feedback, grade, and — [point out a graded submission with an attached file] — a link straight through to any file that child attached to their submission. So a parent can literally see the photo of their kid's handwritten algebra work and the grade the teacher gave it, in one screen.

Every one of these endpoints — courses, assignments, stats — takes the student ID from the URL and immediately checks it against this parent's own links before touching any other data. I tested this directly: pointing this exact same account at a different student's ID that isn't linked to them returns a 404 with 'no linked child with this id,' not real data, not even a hint that the ID exists. That boundary is enforced on every single request, server-side, not just hidden in the UI."

---

## Closing (30 seconds)

"So — one platform, five roles, each with a purpose-built view and a hard permission boundary underneath it, all running against a single multi-tenant PostgreSQL database with school-level data isolation enforced at the API layer, not just the UI. Academic core — courses, modules, lessons, assignments, grading. An engagement layer — XP, streaks, badges, challenges, games. A communication layer — announcements, discussions, calendar, notifications. AI woven through course creation, tutoring, grading assistance, and creative prompts, behind a provider-agnostic interface so we're not locked into one AI vendor. And as of this latest round: full Kindergarten-through-12 grade support, real file and photo submissions for the kind of handwritten work every K-12 classroom actually assigns, and a genuine parent-facing portal — the three things that were the biggest gaps against what a real US school actually expects."

---

## Appendix: Quick reference of the full module list, by role

**Super Admin:** Platform Dashboard · Schools · Subscriptions · Platform Settings · Activity Logs · Golden Source Templates

**School Admin:** Dashboard · Teachers · Students (+ bulk Excel import) · Grades (K-12) · Parents · Reports · Announcements · Challenges · Learning Community · Academic Calendar · Settings

**Teacher:** Dashboard · My Courses · Course Builder (manual / AI / PDF-to-course) · Course Details (modules, lessons, scheduled release, prerequisites) · Assignments (Quiz / Homework / Project / Gamified Match, auto-graded quizzes) · Submissions & Grading (AI-suggested grades, file attachments) · Students · Analytics · Announcements · Discussions · Academic Calendar · Reports · AI Teaching Assistant · Challenges · Manage Games · Creative Submissions · Learning Community · Settings

**Student:** Dashboard (join-by-code, XP/level, leaderboard) · My Courses · AI Tutor · Assignments (text + photo/file submission) · Rewards · Profile · Announcements · Discussions · Academic Calendar · Challenges · Fun Games · Creative Lab · Learning Community

**Parent/Guardian:** My Children (dashboard) · Child Detail (courses, assignments, grades, submitted files — read-only, link-verified)

**Cross-cutting systems:** JWT authentication · Role-based access control · Multi-tenant school-scoping · AI provider abstraction (Gemini / Claude) · Gamification (XP, streaks, badges via StudentStats) · Notifications (grade posted, announcement, discussion reply, new submission, challenge bonus) · File upload & static serving
