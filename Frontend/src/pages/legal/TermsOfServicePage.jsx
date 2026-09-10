import LegalDocumentLayout from "./LegalDocumentLayout";

export default function TermsOfServicePage() {
  return (
    <LegalDocumentLayout title="Terms of Service" effectiveDate="September 3, 2026">
      <p>
        These Terms of Service ("Terms") govern access to and use of AI Learning Suite (the "Platform") by
        schools and their authorized Users (School Admins, Teachers, Students, and Parents). By accessing the
        Platform, a school and its Users agree to these Terms.
      </p>

      <h2 className="text-base font-semibold text-slate-900">1. Accounts and roles</h2>
      <p>
        Accounts are provisioned by a school's Super Admin or School Admin. Each User is responsible for keeping
        their login credentials confidential and for all activity under their account. Access to features is
        determined by the role assigned to the account (Super Admin, School Admin, Teacher, Student, or Parent);
        Users may not attempt to access data or features outside their assigned role.
      </p>

      <h2 className="text-base font-semibold text-slate-900">2. Acceptable use</h2>
      <p>
        The Platform may be used only for legitimate educational administration and instruction. Users may not:
        upload content that is unlawful, infringing, or harmful to minors; attempt to bypass role-based access
        controls or security features; use the Platform's AI features to generate content that violates
        academic integrity policies; or share their login credentials with another person.
      </p>

      <h2 className="text-base font-semibold text-slate-900">3. School and Platform responsibilities</h2>
      <p>
        The school is responsible for the accuracy of the data it enters (rosters, grades, attendance) and for
        obtaining any consents required from parents or guardians. The Platform operator is responsible for
        making the Platform available, maintaining reasonable security controls, and processing school data only
        as instructed by the school and as described in the Privacy Policy and Data Processing Agreement.
      </p>

      <h2 className="text-base font-semibold text-slate-900">4. AI-generated content</h2>
      <p>
        AI-generated content (course outlines, tutoring responses, grading suggestions, creative content) is
        provided as a drafting and support aid. It may contain errors and should be reviewed by a qualified
        educator before being relied upon for instructional or grading decisions. The Platform does not warrant
        the accuracy of AI-generated content.
      </p>

      <h2 className="text-base font-semibold text-slate-900">5. Availability</h2>
      <p>
        The Platform is provided on an "as available" basis. Scheduled maintenance and updates may result in
        brief periods of downtime, which will be kept to a minimum where practicable.
      </p>

      <h2 className="text-base font-semibold text-slate-900">6. Suspension and termination</h2>
      <p>
        Access may be suspended for a User or an entire school in the event of a suspected security incident,
        a material breach of these Terms, or at the request of the school's own administration (for example,
        when a User leaves the school).
      </p>

      <h2 className="text-base font-semibold text-slate-900">7. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by applicable law, the Platform operator is not liable for indirect,
        incidental, or consequential damages arising from use of the Platform, including reliance on
        AI-generated content.
      </p>

      <h2 className="text-base font-semibold text-slate-900">8. Changes to these Terms</h2>
      <p>
        These Terms may be updated from time to time. Continued use of the Platform after an update constitutes
        acceptance of the revised Terms.
      </p>
    </LegalDocumentLayout>
  );
}
