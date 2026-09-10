import LegalDocumentLayout from "./LegalDocumentLayout";

export default function PrivacyPolicyPage() {
  return (
    <LegalDocumentLayout title="Privacy Policy" effectiveDate="September 3, 2026">
      <p>
        This Privacy Policy explains what information AI Learning Suite ("the Platform") collects from schools,
        administrators, teachers, students, and parents ("Users"), why it is collected, and how it is used,
        stored, and protected.
      </p>

      <h2 className="text-base font-semibold text-slate-900">1. Information we collect</h2>
      <p>
        Account information: name, email address, role, and school affiliation, provided when a School Admin
        creates an account on a User's behalf, or when a User logs in. Academic data: enrollments, assignments,
        submissions, grades, attendance records, report cards, and progress notes, created and maintained by
        schools using the Platform. Communications: messages sent through the Platform's built-in messaging and
        discussion features, and support notes recorded by Platform staff. Usage data: login activity, feature
        usage, and AI-feature interactions (such as prompts sent to the AI Tutor or AI Teaching Assistant),
        recorded for security, billing, and product-improvement purposes.
      </p>

      <h2 className="text-base font-semibold text-slate-900">2. How we use information</h2>
      <p>
        Information is used to operate the Platform's core features (course delivery, grading, communication,
        scheduling), to power AI-assisted features (tutoring, content generation, grading assistance), to
        maintain security and an audit trail of administrative actions, and to communicate with schools about
        their account and the Platform.
      </p>

      <h2 className="text-base font-semibold text-slate-900">3. Children's data and school responsibility</h2>
      <p>
        Much of the data on this Platform relates to students, some of whom are minors. Each school, not the
        Platform operator, is the data controller for its students' records and is responsible for obtaining any
        parental consent required under applicable law (such as COPPA in the United States, or GDPR/UK GDPR for
        schools in the EU/UK) before enrolling a student. The Platform acts as a data processor on the school's
        behalf and does not sell student data or use it for advertising.
      </p>

      <h2 className="text-base font-semibold text-slate-900">4. AI features</h2>
      <p>
        When a User interacts with an AI-powered feature, the relevant text (such as a tutoring question, a
        course outline prompt, or a submission being graded) is sent to a third-party AI provider (such as
        Google Gemini or Anthropic Claude) to generate a response. Provider selection and configuration are
        controlled by the school's administrator. Estimated AI usage volume, but not the underlying answer key
        for graded work, is retained for cost-metering purposes.
      </p>

      <h2 className="text-base font-semibold text-slate-900">5. Data retention and deletion</h2>
      <p>
        Data is retained for as long as a school's account remains active, plus any additional period required
        for legal, audit, or archival purposes. Students, parents, and school administrators may request export
        or deletion of personal data as described in the Platform's data export and deletion tooling; a School
        Admin or Super Admin can action such requests on a User's behalf.
      </p>

      <h2 className="text-base font-semibold text-slate-900">6. Security</h2>
      <p>
        Access to the Platform is role-scoped: a User can only see the schools, courses, and student records
        their role and relationships entitle them to. Administrative actions are recorded in an audit log.
        Passwords are stored using industry-standard hashing and are never visible to Platform staff in plain
        text.
      </p>

      <h2 className="text-base font-semibold text-slate-900">7. Changes to this policy</h2>
      <p>
        This policy may be updated as the Platform's features change. Material changes affecting how student
        data is handled will be communicated to School Admins in advance of taking effect.
      </p>

      <h2 className="text-base font-semibold text-slate-900">8. Contact</h2>
      <p>
        Questions about this policy should be directed to your school's administrator, who can escalate to the
        Platform's support team on your behalf.
      </p>
    </LegalDocumentLayout>
  );
}
