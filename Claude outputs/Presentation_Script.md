# AI Learning Suite — Presentation Script
### Target length: 8–10 minutes · 20 slides

Notes before you present:
- Text in *(italics inside parentheses)* is a stage direction, not something to say out loud.
- Where the script says "click" it means advance to the next slide.
- This version is longer than a typical first draft because Slides 14–18 now describe *real* screenshots and *real* test results instead of placeholders — practice it once out loud with a timer. At a normal conversational pace it reads at roughly 9 minutes.
- If your reviewer asks you to cut time, the safest slides to shorten are 9–12 (the diagrams) — point and summarize rather than reading every line — and the second half of Slide 6 (Risk Analysis).

---

## Slide 1 — Title

*(Let it sit for 2–3 seconds before you speak.)*

Good [morning/afternoon]. My name is Angeline Jenita, and I'm going to walk you through the AI Learning Suite — a multi-tenant, AI-powered school management platform I've built for this review.

The one-line pitch: it's a system where multiple schools share one codebase, but each one gets its own isolated workspace, and where AI is woven into the actual teaching workflow — not bolted on as a chatbot in the corner.

**(Click)**

---

## Slide 2 — Agenda

Here's how I'll walk through it. I'll start with the abstract — what the project actually is. Then functionalities, risk analysis, the database design, the UML diagrams behind the detailed design, where implementation currently stands, some results and screenshots, then testing — both unit and integration — and finally references.

**(Click)**

---

## Slide 3 — Abstract

So, what is this project.

AI Learning Suite is a multi-tenant school-management platform. That word "multi-tenant" is doing a lot of work here — it means every school that signs up gets what feels like its own private application, its own users, its own data, but underneath, they're all running on the exact same codebase and the same database. That's the architecture choice that makes this maintainable — I fix a bug once, every school gets the fix.

On top of that, there are five distinct roles — Super Admin, School Admin, Teacher, Student, and Parent — and each one gets a dashboard actually built for what they need to do, instead of one generic screen with a bunch of tabs everyone has to dig through.

The part I want to underline, because it shapes almost every design decision in this project, is the AI philosophy: AI is a reviewed assistant, not an autonomous grader. It drafts a course outline, it answers a student's question grounded in that student's actual course content, it suggests a score for each rubric criterion — but a human, the teacher, always makes the final call before anything is saved to a student's record. I'll show you exactly how that's enforced in the sequence diagram later on.

Under the hood: FastAPI and PostgreSQL on the backend, React on the frontend, and — this is a detail I'm a little proud of — the AI provider itself is swappable. A school can run on Anthropic Claude or Google Gemini, and it's a configuration choice, not a code change.

**(Click)**

---

## Slide 4 — Functionalities Overview

This is the full feature surface, grouped the way the product actually breaks down.

Course and curriculum: courses contain modules, modules contain lessons, and a teacher can either build that by hand or have AI generate a first draft. Assignments and grading: quizzes grade themselves instantly, and written work gets AI-assisted grading — either against a rubric or an answer key. Attendance is marked per class by the teacher and shows up in real time for students and parents. Grades and reports covers rosters, report cards, and export to Excel or PDF.

Then there's gamification — challenges and game-based assignment types — and announcements and discussions for school- and course-level communication.

And at the platform level: multi-tenant admin, where the Super Admin manages schools and subscriptions, and trust and compliance — role-based access control, data-deletion requests, and a complaints pipeline that routes up to the Super Admin.

**(Click)**

---

## Slide 5 — AI Features, In Depth

I want to slow down on the AI layer specifically, because that's the differentiator.

Four features. The Course Builder generates a full course structure — modules and lessons — even starting from an uploaded PDF, and the teacher edits and publishes from there. The AI Tutor is student-facing, but it's grounded — it answers based on the actual course and lesson content that student is enrolled in, so it's not just giving generic textbook answers. Answer-Key Grading compares a submission against a teacher-provided key for objective written answers. And Rubric Grading — this is the most involved one — scores each rubric criterion independently, with a justification for each score.

And the line at the bottom is the one that matters most: every AI suggestion is reviewed and can be overridden by a teacher before it's saved. AI drafts, humans decide. That's not just a design philosophy — as I'll show in a couple of slides, it's actually enforced server-side.

**(Click)**

---

## Slide 6 — Risk Analysis

Every real project has risks, and I wanted to be honest about ours rather than pretend the system is bulletproof.

The one I'd call out first is AI hallucination in grading — medium likelihood, high impact if it went unchecked. The mitigation is layered: the server clamps any AI-suggested score to that criterion's maximum, drops any score for a criterion ID it doesn't recognize, and — as we just said — a teacher has to review it before it's saved. So even a bad AI response can't corrupt a grade.

Cross-tenant data leakage is the one I'd call highest-stakes, even though I've rated it low-likelihood — because if a school could ever see another school's data, that's a critical trust failure. Every single scoped query filters by the school ID pulled from the caller's own JWT token, and cross-school access is something we specifically test for, not just something we assume works.

The others — provider outage, auth bypass, scope creep, schema drift — each have a concrete mitigation, which you can read on the slide: provider-agnostic AI service, JWT plus bcrypt with rate limiting, a keep-consolidate-cut review framework, and versioned reversible migrations.

**(Click)**

---

## Slide 7 — Database Design: Table Design Principles

Before the actual diagram, four principles that shaped the schema.

Every tenant-scoped table carries a school_id foreign key, and that boundary is enforced in application code on every query — not something we're just trusting the database to handle. Twenty-seven Alembic migrations have been applied so far, and every one of them is reversible — that's the versioned-migration discipline I mentioned as a risk mitigation a moment ago. Primary keys are UUID strings rather than auto-increment integers, which means they're safe to put in a URL and safe to generate on the client before the record even exists on the server. And cascading deletes are explicit and considered per relationship — delete a school, its users and courses go with it; delete a course, the students who were enrolled in it are not deleted.

**(Click)**

---

## Slide 8 — Entity Relationships

Here's the core academic schema — the nine tables that everything else hangs off of.

A school has users and grades. A user — which covers every role, from Super Admin down to Parent — belongs to a school and optionally a grade, and can create courses. A course belongs to a school, has modules, and has assignments. Assignments optionally link to a rubric made of rubric criteria, and they collect submissions from students. Modules break down into lessons.

And as the caption says — every one of these also carries that school_id boundary. The rest of the schema — enrollments, attendance records, complaints, parent-student links, and so on — exists too; I just kept this diagram to the core academic path so it's actually readable.

**(Click)**

---

## Slide 9 — System Architecture

This is the full stack, top to bottom.

Presentation layer: a React 19 single-page app, built with Vite and Tailwind, with role-based dashboards for each of the five roles, talking to the backend through an Axios client that attaches a JWT bearer token on every call.

Application layer: FastAPI, and you can see it's organized into routers — auth, super_admin, school_admin, teacher, student, parent, ai, attendance, rubrics — each one guarded by a require_roles dependency, so a student hitting a teacher-only endpoint just gets rejected before any business logic runs.

Service layer is where the actual logic lives: Auth and RBAC, the AI Service — which is that provider-agnostic facade I mentioned — and Domain Services for grading, reports, and notifications.

And at the bottom, data and external AI: PostgreSQL through SQLAlchemy 2.0 with Alembic migrations, and then the two swappable AI backends, Claude and Gemini.

**(Click)**

---

## Slide 10 — Use Case Diagram

This maps each role to what they can actually do in the system.

Super Admin manages schools and subscriptions, and platform settings including maintenance mode. School Admin manages teachers, students, and parents, and handles complaints. Teacher is the busiest role — building courses, grading submissions with AI assistance, and marking attendance. Student submits assignments, self-tracks grades, and asks the AI tutor questions. And Parent views their child's grades, attendance, and announcements.

**(Click)**

---

## Slide 11 — Class Diagram — Core Domain

This is the object-oriented view of the same core domain — the actual classes and their key methods.

School, User, Course, and Assignment along the top; Grade, Module, RubricCriterion, and Submission below them. You can see the relationship multiplicities — a school has one-to-many users, a course has one-to-many assignments, and so on.

And down here at the bottom is the piece I want to highlight: AIService and BaseAIProvider. AIService is what the rest of the application talks to — it exposes methods like grade_submission_with_rubric and tutor_chat — and it delegates to whichever concrete provider is configured, Claude or Gemini. That's the abstraction that makes the AI backend swappable without touching any of the calling code.

**(Click)**

---

## Slide 12 — Sequence Diagram — AI Rubric Grading

I saved this one for last in the design section because it's the clearest proof of the "AI drafts, human decides" principle in action.

A teacher clicks "AI Suggest Rubric Scores." That goes to the frontend, which posts to the FastAPI AI router. FastAPI first verifies the submission and rubric actually belong to the caller's own school — that's the tenant boundary again — then calls AIService, which prompts the actual AI provider with the criteria and gets back raw suggestions.

And here's the important step: before those suggestions ever reach the teacher's screen, the backend clamps every point value to that criterion's maximum and drops anything with a criterion ID it doesn't recognize. Only after that validation do the suggestions get sent back to pre-fill the teacher's score boxes — and the teacher still reviews, edits, and saves them manually.

As the caption says: AI never auto-saves a grade.

**(Click)**

---

## Slide 13 — ~70% Complete

Where the project actually stands right now.

Core platform — auth, roles, schools, courses — is at ninety-five percent. Academic workflows, eighty-five. AI features sit at eighty percent — the core flows work end-to-end, there's polish left. Admin and compliance at seventy-five. The two areas that are honestly still behind are automated test coverage, at fifty-five percent, and deployment and production hardening, at forty percent — that's the full regression suite, the production deployment pipeline, and real-user usability testing with actual teachers and students, which is exactly what's planned for the next phase.

Overall, that nets out to roughly seventy percent complete — built, wired end-to-end, and functionally verified.

**(Click)**

---

## Slide 14 — Application Walkthrough (1/3)

These aren't mockups — every screenshot from here through Slide 16 is captured from the actual application, running against a realistic seeded dataset for a fictional school called Meridian STEM Academy. *(One honest disclosure, say it once, here:)* The three AI-generated screens later on used pre-written, realistic AI responses instead of live calls to Claude or Gemini, purely to avoid burning API quota during testing — the surrounding application logic is completely real.

On the left: logging in as a School Admin and landing straight on their dashboard — the role-based redirect at work. No matter which of the five roles logs in, they land on a dashboard built for them, not a generic landing page they have to navigate away from.

On the right: the Super Admin's view of that same school's detail page, on the Students tab — the full real roster, thirteen students, each with their name and email. This is the page that used to be broken, incidentally — the Teachers, Students, and Courses tabs were hardcoded empty before a fix I shipped and covered with a regression test, which you'll see again in the unit testing section.

**(Click)**

---

## Slide 15 — Application Walkthrough (2/3)

On the left: a teacher's AI Course Builder. I filled in a course name, grade level, and learning objectives, hit Generate, and the panel on the right filled in with a complete course — "Quadratic Functions Deep Dive," three modules, five lessons, objectives and prerequisites included. The teacher edits any of this before publishing; nothing here is published automatically.

On the right: the student side of the AI layer — the AI Tutor. The student asked a real conceptual question about their own assignment — "in my equation C = 5g + 20, which part is the slope and which is the y-intercept" — and the tutor answered grounded in that exact equation, not a generic textbook definition, and followed up with a related question to keep the student thinking rather than just handing over the answer.

**(Click)**

---

## Slide 16 — Application Walkthrough (3/3)

On the left: rubric grading with AI assistance. This is the same "AI Suggest Rubric Scores" flow from the sequence diagram — four criteria, each scored independently with a short justification, totaling 33 out of 35, all pre-filled into editable fields the teacher still has to review and save.

On the right: a parent's view of their child's grades — enrolled courses, assignments, and a ninety-three percent average, with each assignment's actual score shown against its real point total. I'll be honest about this one: the first version of this screen showed an average of two hundred and forty-four percent, because my seed data was assigning grade points that didn't respect each assignment's actual maximum. I found that by looking at my own screenshot, traced it to the seed script, and fixed the underlying data before capturing what's on the slide now.

**(Click)**

---

## Slide 17 — Module-Level Test Coverage

For unit testing, I'm tracking coverage module by module rather than just reporting one aggregate number, because that's more honest about where the gaps are — and every panel on this slide is a real, unedited pytest run against the project's own test suite, executed on an isolated throwaway database, never the live one.

Ninety-nine tests across twenty-one modules. Ninety-seven pass. I want to be upfront about the two that don't, both in test_audit_logging.py: the Super Admin's activity-log view was recently redesigned to only show actions performed *by* a Super Admin — support password resets, resolving complaints, that kind of thing — so it wouldn't get flooded with routine day-to-day school activity. These two tests predate that redesign and still expect a School-Admin-performed action, like deleting a student, to show up in that filtered view. That's a real inconsistency between an older test and an intentional later design change, and it's exactly the kind of thing this kind of testing is supposed to catch — I have it flagged to either update the tests or revisit the filter, depending on which behavior is actually correct.

**(Click)**

---

## Slide 18 — End-to-End Flow Verification

Integration testing goes one level up from unit tests — it checks that entire user journeys work correctly across multiple roles and multiple real API calls, not just that one function returns the right value. Nothing on this slide is mocked; these are live HTTP calls against the running, seeded application.

First flow: a teacher creates an assignment, a student submits it, and the teacher saves a rubric-based grade — the full loop from the sequence diagram, and it passed cleanly end to end. Second flow: a School Admin raises a complaint, and it correctly shows up in the Super Admin's cross-school queue and can be resolved — also clean.

The third flow is the one I actually want to spend a moment on, because it's the most useful result on this entire slide. I wrote a check that toggles maintenance mode on and then tries to log in as a regular teacher, expecting the backend to reject it. It didn't — it returned a normal, successful login. What that told me is that maintenance mode was only ever being enforced in the React frontend, which checks a status flag before showing the login form — but the backend API itself never checked it, so a direct call could always slip through. I've since patched the login endpoint to check the platform setting server-side too, with the Super Admin exempted so they can always get back in to turn it off, and confirmed the fix works with the same test. That's a real finding this project's own integration testing surfaced and fixed.

**(Click)**

---

## Slide 19 — References

These are the core technologies and their official documentation — FastAPI, SQLAlchemy, Alembic, React, Tailwind, PostgreSQL, and the Anthropic and Google AI API docs for the two providers this project integrates with.

*(If your program requires academic literature citations, add two or three papers on AI-assisted grading or adaptive learning platforms in the box at the bottom before presenting.)*

**(Click)**

---

## Slide 20 — Thank You

That's the AI Learning Suite — a multi-tenant platform where AI assists across the teaching workflow, but a human always makes the final call on anything that touches a student's grade.

Thank you. I'm happy to take any questions.

*(End. Pause and wait for questions — do not fill the silence.)*

---

## Appendix: Anticipated questions and short answers

**"Why did you choose to make the AI provider swappable instead of just picking one?"**
Two reasons: cost and reliability. If a school's preferred provider has an outage or a pricing change, they can switch with a configuration flag instead of a code deployment. It's implemented as one interface, BaseAIProvider, with a Claude implementation and a Gemini implementation behind it.

**"How exactly do you prevent one school from seeing another school's data?"**
Every tenant-scoped table has a school_id column, and every query that touches those tables filters by the school_id taken from the caller's own JWT — never from a request parameter the client could tamper with. That boundary is tested directly, including tests that specifically try to access another school's data and confirm it's rejected.

**"What happens if the AI gives a bad or nonsensical grading suggestion?"**
Three layers of protection: the prompt itself constrains the AI to strict JSON output; the backend clamps any returned point value to that criterion's maximum and silently drops any suggestion tied to a criterion ID that doesn't exist on that rubric; and finally, the teacher sees the suggestion pre-filled in an editable field and has to manually save it — nothing is written to the database until a human confirms it.

**"What's left before this could go to production?"**
Mainly two things: finishing the automated regression test suite, and the production deployment and hardening work — things like environment-specific configuration, monitoring, and load testing. Both are tracked explicitly on the implementation status slide.

**"Why UUID primary keys instead of auto-increment integers?"**
Two reasons: they can be generated on the client before the record is even saved to the server, which simplifies some AI-generation flows, and they're safe to expose directly in a URL without leaking information about how many rows exist in a table.

**"You said two tests are failing — why present that instead of just fixing it beforehand?"**
Because it's true, and it's a more accurate picture of the project than pretending everything is green. It's also a genuinely interesting result: it's not a bug in the running application, it's a mismatch between an older regression test and an intentional later redesign of what the Super Admin's activity log shows. That distinction — "is this a bug, or a test that's now testing the wrong thing" — is itself a normal part of maintaining a test suite over time.

**"Tell me about a bug you found while building this."**
The maintenance-mode one is the most interesting: the toggle worked perfectly from the UI, because the frontend checks a status flag before showing the login form. But the backend's actual login endpoint never checked that same flag, so a direct API call could log in during "maintenance" regardless of role. I only found it by writing an integration test that exercised the real login endpoint directly instead of trusting the UI, which is exactly the kind of gap that kind of testing is supposed to catch. I've since fixed the backend to check it too.
