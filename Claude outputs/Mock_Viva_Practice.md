# AI Learning Suite — Mock Viva Practice
### A reviewing teacher's questions, and how to answer them

How to use this: read a question, cover the answer, try answering out loud first, *then* check it against the model answer below. The model answers are written the way you'd actually say them — conversational, not a textbook definition — because that's what will actually come out of your mouth under pressure. Adapt the wording to sound like you, not like you memorized a script.

The questions are grouped by topic and get progressively harder within each group. The last section, "Sharp questions," is what a genuinely engaged reviewer asks *after* your main answers satisfy them — the follow-ups that probe whether you actually understand your own project or just built it.

---

## 1. The big picture

**Q: In one sentence, what does this project actually do?**

It's a school management platform that multiple schools can use at once, each with their own isolated data, where teachers, students, and parents each get a dashboard built for their role, and AI helps with course creation, tutoring, and grading — but never has the final say on anything that touches a student's record.

**Q: Why "multi-tenant" specifically? Why not just build one system per school?**

Because one codebase serving many schools means I fix a bug once and every school gets the fix, I ship a feature once and every school gets it, and the cost of running the platform doesn't multiply per school. The tradeoff is that I have to be very disciplined about isolating each school's data — which is exactly what the school_id boundary on every table is for.

**Q: Who are your five user roles, and why five separate dashboards instead of one dashboard with permissions?**

Super Admin, School Admin, Teacher, Student, and Parent. I could have built one screen and just hidden buttons based on role, but that tends to produce a UI that's technically correct but practically confusing — a teacher doesn't want to see a School Admin's navigation with half of it grayed out. Building each dashboard around what that role actually does made the product simpler to use, even though it was more work to build.

**Q: What's the one design decision in this project you'd defend most strongly if I disagreed with it?**

That AI never saves anything directly — it only ever produces a suggestion that pre-fills an editable field, and a human has to explicitly save it. I could have built a faster, flashier demo by letting AI auto-grade and auto-publish, but for anything that affects a student's actual grade or a published course, I think that's the wrong tradeoff, and I built the architecture specifically to make bypassing that review difficult, not just discouraged.

---

## 2. Architecture and tech stack

**Q: Walk me through what happens, system by system, when a teacher clicks "Generate Course."**

The React frontend sends the form data with a JWT bearer token to a FastAPI endpoint. FastAPI's dependency layer checks the token, confirms the caller is a Teacher, and confirms the course belongs to their own school. Then it calls AIService, which is a thin abstraction that doesn't know or care whether it's talking to Claude or Gemini — it delegates to whichever concrete provider that school is configured to use. The provider returns a course structure, FastAPI hands it back to the frontend, and the teacher sees it in an editable panel. Nothing is saved to the database until the teacher clicks Publish.

**Q: Why FastAPI instead of, say, Django or Express?**

FastAPI gives me automatic request validation and API documentation from Python type hints via Pydantic, and it's async-native, which matters when a request is going to sit waiting on a slow external AI API call — it doesn't block a worker thread while that's happening. It also has a very clean dependency-injection system, which is what my require_roles guards are built on.

**Q: What is a "provider-agnostic AI service" and why does it matter?**

It's one interface, BaseAIProvider, with two implementations behind it — one for Anthropic Claude, one for Google Gemini. The rest of the application only ever calls AIService's methods, like grade_submission_with_rubric, and never talks to either provider's SDK directly. That means if I want to add a third provider, or a school wants to switch providers because of cost or an outage, it's a configuration change in one place, not a rewrite scattered across every feature that uses AI.

**Q: What would break first if you had ten thousand schools on this platform instead of a handful?**

Honestly, probably the database — a single PostgreSQL instance with every school's data in shared tables will eventually need either read replicas or some sharding strategy once the row counts get large enough, and I haven't built for that yet. The application layer would scale more easily since FastAPI is stateless and I could just run more instances behind a load balancer.

---

## 3. Database design

**Q: Why UUID strings for primary keys instead of auto-increment integers?**

Two reasons. First, they're safe to put directly in a URL — an integer ID leaks information, like roughly how many rows exist or which record was created near another one. Second, a UUID can be generated on the client or in application code before the row is even inserted, which matters for a couple of my AI-generation flows where I want to reference an ID before the transaction commits.

**Q: How many migrations have you run, and why does that number matter?**

Twenty-seven Alembic migrations, every one of them reversible. It matters because it means the schema's history is fully reconstructable and any single change can be rolled back independently — I'm not relying on manually-applied SQL scripts or a schema that only exists correctly in one developer's head.

**Q: What happens to a course's assignments if I delete the course? What about a student enrolled in it?**

Deleting a course cascades to its own modules, lessons, and assignments — those don't have independent meaning without the course. But deleting a course does not delete the students who were enrolled in it; enrollment is a separate relationship, and a student's existence in the system obviously shouldn't depend on one course they happened to take.

**Q: Show me — where in the code is the multi-tenant boundary actually enforced? Convince me it's not just a comment.**

Every tenant-scoped table has a school_id column, and every query path takes that school_id from the caller's own JWT — set at login, signed by the server — never from anything the client sends in a request body or URL. So even if a malicious client edited a request to ask for another school's data by ID, the query itself is already filtered to the caller's own school_id and simply wouldn't return it. I have tests that specifically try this — logging in as one school's admin and attempting to read another school's roster — and confirm it comes back empty or forbidden.

---

## 4. The AI features

**Q: Walk me through exactly what stops the AI Tutor from just making things up to a student.**

The tutor's prompt is grounded — it's given the actual content of the course and lesson the student is enrolled in, not just a generic "you are a helpful tutor" instruction. So when a student asks about their own assignment, the model is answering with that assignment's actual content in front of it, not guessing from general training knowledge. It's not a hard mathematical guarantee against hallucination — no LLM has that — but grounding it in real curriculum content is the main mitigation, plus this is explicitly explanatory content, not something that gets saved to a student's permanent record the way a grade does.

**Q: Rubric grading is the one that worries me most, because it touches actual grades. Convince me it's safe.**

Three layers. First, the prompt constrains the model to return strict JSON matching the rubric's actual criteria. Second — and this is the important one — the backend independently validates every returned score: it clamps any point value to that criterion's own maximum, and if the AI returns a criterion ID that doesn't exist on that rubric, that suggestion is silently dropped rather than trusted. Third, none of it is saved automatically — it pre-fills an editable form, and the teacher has to review and click Save. So even a completely broken AI response — wrong IDs, scores way over the max — can't corrupt a grade, because the server doesn't trust the AI's output, it validates it.

**Q: Did you actually test what happens when the AI returns garbage?**

Yes — there's a unit test that specifically submits a score above a criterion's maximum and confirms the API rejects it rather than silently accepting it. That's tested at the same boundary a real malformed AI response would hit, so it doesn't matter whether the bad input comes from an AI provider misbehaving or something else entirely.

**Q: Your slides say the walkthrough screenshots used "pre-seeded" AI responses instead of live ones. Isn't that a bit dishonest for a demo?**

I don't think so, and I was upfront about it in the deck rather than hiding it — the caption says so directly. The reason is purely cost: three of my screenshots needed to show an AI response, and calling a real paid API repeatedly while I was iterating on getting the screenshot framing right would have burned through quota for no benefit, since the application code rendering that response is identical either way. What's real in those screenshots is the entire request path — the form, the API call, the validation, the rendering — the only thing substituted is the specific text the AI provider would have returned.

---

## 5. Risk, security, and what could go wrong

**Q: What's the single biggest risk in this system, in your own opinion, not just what's on the slide?**

Cross-tenant data leakage, even though I rated its likelihood low. Everything else — a bad AI suggestion, an outage, scope creep — is recoverable or has a workaround. If one school ever saw another school's student data, that's not a bug you patch and move on from, it's a trust failure that could end the product. That's why it gets the most rigorous testing of anything in the codebase.

**Q: How do you actually authenticate users, and why bcrypt for passwords?**

JWT bearer tokens issued at login, containing the user's ID, role, and school ID, signed by the server. Passwords are hashed with bcrypt, which is deliberately slow — it's designed to make brute-forcing a stolen password hash computationally expensive, unlike a fast hash like plain SHA-256, which would make offline password cracking far too cheap.

**Q: Tell me about a real bug you found while building this — not a hypothetical, an actual one.**

There are a few, but the most interesting is the maintenance-mode gap. The Super Admin can toggle platform-wide maintenance mode, and the frontend correctly checks that flag and shows a maintenance screen instead of the login form. But when I wrote an integration test that called the login API directly — bypassing the frontend entirely — it succeeded anyway, for any role. The backend's login endpoint had simply never been checking that flag; the entire protection was client-side only. I found that specifically because I tested the real endpoint instead of trusting that the UI's behavior meant the system was actually enforcing it, and I've since fixed the backend to check it server-side too, with the Super Admin exempted so they can always get back in.

**Q: What other real bugs did you find, and how did you find each one?**

Three more. One: creating a new school crashed with a database error, because the code referenced the new school's ID before the database had actually assigned it — I found that by exercising the real endpoint rather than just a mocked unit test, using it to seed demo data. Two: a parent's view of their child's assignments crashed when comparing an assignment's due date to the current time, because one was timezone-aware and the other wasn't — Python refuses to compare those directly, and I hit it by actually loading that page instead of just testing the underlying query in isolation. Three: password hashing was silently at risk of breaking because of a version mismatch between two of my dependencies — passlib and bcrypt — which I caught because the very first user the system tries to create, the bootstrap Super Admin, failed to be created with a cryptic warning I chose to actually investigate instead of ignoring.

---

## 6. Testing

**Q: Ninety-nine tests, twenty-one modules — what's actually in that suite? Give me an example beyond "it checks login."**

It ranges from access-control tests — a student trying to hit a teacher-only route and getting rejected — to business-logic tests, like confirming that grading against a rubric derives the total strictly from the criteria scores rather than trusting a separately-submitted total that could disagree with the rubric math. There are also tests for attendance notifications, parent visibility scoping, SSO configuration, and audit logging.

**Q: You told me two tests are failing. Why would you show me that instead of just fixing it first?**

Because presenting ninety-nine passing tests when two are actually failing would be worse than presenting the truth. And in this case the failure is genuinely informative, not embarrassing: the Super Admin's activity-log view was intentionally redesigned to only show actions the Super Admin themselves performed, so it doesn't get flooded with routine school-level activity. Two older regression tests still expect a School-Admin-performed action to show up in that filtered view, which it no longer does by design. That's a real disagreement between an old test and a newer intentional change, and deciding which one is "right" — update the test, or revisit the filter — is a legitimate engineering judgment call, not a bug I overlooked.

**Q: What's the difference between what your unit tests check and what your integration tests check?**

A unit test exercises one endpoint or one function in isolation — does grading reject a score above the maximum, does an unauthenticated request get rejected. An integration test chains several of those together across roles to prove an entire real-world journey works — a teacher creating an assignment, a student submitting it, and the teacher saving a grade, as three separate real API calls in sequence, using the actual database state each step leaves behind for the next one.

**Q: Are your tests running against your real production database?**

No — never. The test suite overrides the database connection to a completely separate, throwaway SQLite file before any application code is even imported, and that file is deleted at the end of the run. It's a hard rule in the test setup specifically so there's no way to accidentally run a test against real school data.

---

## 7. Where the project stands, and what's next

**Q: You say seventy percent complete. What's actually missing in that other thirty percent?**

Two things mainly. First, automated test coverage is at fifty-five percent — the core paths are tested but I haven't reached full regression coverage yet. Second, production hardening — environment-specific configuration, monitoring, load testing, an actual deployment pipeline — is at forty percent, because up to now the priority has correctly been building and correctness-testing the feature set itself before hardening it for real-world load.

**Q: If I gave you one more month, what would you build first?**

I'd close out the automated test suite to cover the admin and compliance workflows more completely, since that's currently the thinnest-tested area relative to how much it touches trust and safety. Then I'd start the production deployment work, because right now this only runs correctly in a development setup, and getting it running reliably in a real hosting environment is a meaningfully different problem than getting the features themselves correct.

**Q: Is this ready for a real school to use today?**

Not quite, and I'd say that to a school directly if asked. The core academic workflows work end-to-end and are tested, but I wouldn't put real student data into a system that hasn't gone through production hardening and a full security review yet — that's explicitly the next phase, not something I'm treating as optional.

---

## Sharp questions (for a reviewer who's really pushing)

**Q: If AI never has the final say, what's actually stopping a lazy teacher from clicking "Save" on every AI suggestion without reading it — doesn't that make your whole safety argument theoretical?**

That's fair, and it's true that the system can't force a human to actually *think* before clicking save — no software architecture can guarantee that. What it *can* guarantee, and does, is that the suggestion is always validated and clamped before it's even shown, so the worst case if a teacher blindly accepts it is a merely-imperfect-but-bounded score, never a corrupted one — never a score above the maximum, never a score attached to the wrong criterion. The human-review requirement protects against carelessness up to a point; the server-side validation protects against the AI being wrong in a way that could actually damage data, which is the failure mode I have full control over.

**Q: You found four real bugs by testing your own project. Doesn't that undermine confidence in the seventy percent you say is done?**

I'd argue the opposite — finding and fixing four real bugs through deliberate testing, and being able to explain each one precisely, is evidence the testing process works, not evidence the project is weaker than claimed. The alternative isn't a project with zero bugs; it's a project where the same four bugs exist but nobody's found them yet. I'd be far more worried presenting a project where I claimed everything was perfect and couldn't tell you about a single edge case I'd actually gone looking for.

**Q: Why should I believe your risk table wasn't just written after the fact to sound thorough?**

Because the maintenance-mode finding on the integration testing slide is a concrete example of the process the risk table describes actually happening — I didn't predict that specific bug in the risk table, but the general category, "a control that looks enforced but isn't actually enforced everywhere it needs to be," is exactly the kind of thing structured testing is meant to surface, and it did.
