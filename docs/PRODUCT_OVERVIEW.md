# AI Learning Suite — Product Overview

**Generated:** August 27, 2026
**Purpose:** A plain-language walkthrough of what AI Learning Suite does today, who uses it, and how finished each part is — written from a direct review of the running application, not from the original plan.

---

## 1. What It Is

AI Learning Suite is a learning platform built for schools. Instead of one school running its own copy of the software, many schools share the same platform while staying completely separate from one another — a teacher or student at one school never sees another school's data. This kind of setup is called "multi-tenant," and each school is a "tenant."

There are four kinds of people who use the platform:

- **Super Admin** — runs the whole platform across all schools. Onboards new schools, manages their subscriptions, and maintains a shared library of ready-made course templates.
- **School Admin** — runs one school. Adds teachers and students, organizes them into grades/sections, and reviews activity within that school.
- **Teacher** — builds courses, lessons, assignments, quizzes, and games for their students; grades work; tracks progress.
- **Student** — joins courses with a code from their teacher, works through lessons and assignments, gets help from an AI tutor, and tracks their own progress and rewards.

A distinguishing feature: schools can choose which AI provider powers the AI features — currently Google Gemini or Anthropic Claude — set per school by the Super Admin. This is fully built and working, not just planned.

---

## 2. What Each Role Can Actually Do Today

### Super Admin
Sees a platform-wide dashboard (school counts, subscription plan mix, recent activity). Creates, edits, suspends, activates, and deletes schools, and can create that school's first Admin account with them. Manages each school's subscription plan and status. Maintains a shared library of "golden" course templates — pre-built courses that any school's teachers can copy into their own school without affecting the original. Reviews a platform-wide activity log.

A school's detail page has sections for Teachers, Students, and Courses within that school, but those three sections currently always show empty — that part of the page isn't yet connected to real data, even though the underlying records exist. The general Platform Settings page is honest about this itself: it explicitly notes that broader settings "will be persisted here once the backend endpoint exists," and only the template library on that page is actually functional today.

### School Admin
Adds and manages teachers and students, including a bulk-upload flow — download a spreadsheet template, fill it in, upload it, and the system creates accounts automatically (matching or creating grade groups, generating email addresses and temporary passwords, and showing which rows succeeded, duplicated, or failed). Organizes students into grades/sections. Reviews a school-level activity log and a reports page with gradebook export to Excel or PDF. Can update the school's profile and their own account settings.

### Teacher
This is the most built-out role. A teacher can:

- Build a course by hand — modules, lessons, assignments — or generate one with AI, either from a text prompt or by uploading a PDF (a textbook chapter, a worksheet, etc.) that the AI reads and turns into a structured course.
- Publish courses, which generates a join code students use to enroll.
- Create assignments, quizzes, and a "Gamified Match" activity type (a matching-pairs game), either manually or with AI help.
- Review student submissions and grade them by hand, or use "AI Suggest Grade" — upload or paste an answer key, and the AI proposes a grade and feedback that the teacher reviews and approves before it's saved. The AI never grades automatically without a human confirming.
- See real class rosters, per-course enrollment, and analytics (completion rates, submission counts) that are pulled from actual student activity, not estimated.
- Export the full gradebook as Excel or PDF.
- Adopt one of the Super Admin's shared "golden template" courses into their own school with one click.

One small gap: the Settings page for teachers exists and works, but there's no link to it in the sidebar menu — a teacher would need to know the exact web address to find it.

### Student
Joins a course using the code their teacher shares. Works through lessons in a guided course player, including inline quizzes with instant feedback. Marks lessons complete, which earns XP and builds a daily streak. Submits assignments (text or file) and sees real-time status (not started, submitted, graded, overdue). Plays the "Gamified Match" activity when a teacher assigns one. Chats with an AI tutor that only answers using the content of the student's own enrolled course — it can't wander outside the curriculum. Tracks XP, streaks, and badges, and sees a leaderboard ranked against classmates in the same school.

A few reward/progress details aren't fully wired up yet (see the next section) — the features are visible and usable, but some of the numbers behind them (like "students enrolled" on a teacher's course card, or a student's saved lesson-completion state after logging back in) aren't yet pulling from the real database in every place they should.

---

## 3. How Finished Is It?

**The core is real and working end-to-end:** logging in, school/teacher/student management, course and lesson building (manual and AI-assisted), assignment and quiz creation, student enrollment and submission, manual and AI-assisted grading, gradebook exports, and the AI tutor are all genuinely implemented against the real database — this is not a demo shell. Notably, there is **no hardcoded or fake data anywhere on the backend** — every API either returns real database records or a clear "not configured" error; nothing invents data to look complete.

**On the frontend, a handful of spots don't yet match that standard**, and given this project's explicit "no mock data" rule, these are worth prioritizing:

- The notification bell in the header shows three made-up notifications (an invented student name, an invented activity) to every user, on every page — there's no real notifications feature behind it yet.
- A few settings and profile screens show a placeholder value (like a default phone number or subject) before the user has entered anything, instead of leaving the field blank until real data is fetched.
- The "badges" a student can earn are listed slightly differently in two different places in the app, and neither list is tied to the backend.
- A few numbers that should reflect real activity — how many students are enrolled in a course, how many times AI has been used platform-wide, and whether a lesson is marked complete right after logging back in — are currently shown as zero/incomplete by default rather than being pulled from the database, even though the real numbers exist and are calculated correctly elsewhere in the app (e.g., the teacher analytics page does show real completion rates).
- If a save fails behind the scenes in a few places (adding a course, a teacher, a student, a grade, a shared template), the screen currently shows it as if it succeeded rather than surfacing an error — worth fixing so nothing looks saved when it wasn't.

None of this affects the AI features, grading, authentication, or multi-tenant data isolation — those are solid. It's concentrated in a specific set of dashboard/profile screens.

**One feature area is unfinished on the backend too:** an early "Evaluation Games" system (separate from the working "Gamified Match" assignment type students already use) has database tables and API routes, but nothing in the app ever creates a game through that system — it's effectively inactive. The team should decide whether to finish it or remove it, since the working matching-game feature students actually use lives elsewhere (as an assignment type), not through this system.

A couple of small setup items worth knowing about before a real deployment: the platform's very first Super Admin account currently has a default email/password built into the code (used only if those aren't set explicitly), and there's no example configuration file yet to guide setting up a new environment from scratch — both are quick fixes, documented with specifics in the accompanying technical documentation.

---

## 4. Summary Table

| Area | Status |
|---|---|
| Login, roles, and school-level data isolation | Working |
| School / teacher / student management (incl. bulk import) | Working |
| Manual course, lesson, assignment, quiz building | Working |
| AI course generation (from prompt or PDF) | Working, provider-configurable per school |
| Student enrollment via join code, lesson player, progress/XP/streaks | Working (a few progress numbers reset on reload — see above) |
| Submissions, manual grading, AI-assisted grading | Working |
| AI tutor scoped to enrolled course content | Working |
| Gradebook export (Excel/PDF), bulk student import (Excel) | Working |
| Golden template library & adoption | Working |
| Platform/school activity logs | Working |
| Super Admin school-detail Teachers/Students/Courses tabs | Not yet connected to data |
| Notifications | Fake placeholder content, not a real feature yet |
| Header search | Not yet functional |
| "Evaluation Games" backend system | Built but unused / dead code (a separate, working matching-game exists) |
| Password reset / account recovery | Not built |

*(Overview generated from direct inspection of the application on 2026-08-27. See the companion technical documentation for full implementation detail behind every item above.)*
