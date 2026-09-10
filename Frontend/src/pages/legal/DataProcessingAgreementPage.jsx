import LegalDocumentLayout from "./LegalDocumentLayout";

export default function DataProcessingAgreementPage() {
  return (
    <LegalDocumentLayout title="Data Processing Agreement" effectiveDate="September 3, 2026">
      <p>
        This Data Processing Agreement ("DPA") describes how AI Learning Suite (the "Processor") handles personal
        data on behalf of a school (the "Controller") in connection with the Platform, including data relating
        to students who may be minors. Where a school requires its own signed DPA for procurement or compliance
        purposes, this document is intended as the starting basis for that agreement.
      </p>

      <h2 className="text-base font-semibold text-slate-900">1. Roles</h2>
      <p>
        The school is the data controller for the personal data of its students, parents, teachers, and
        administrators. The Platform operator acts as a data processor, handling that data only to provide the
        Platform's features and only on the school's documented instructions (configuration choices made by the
        school's Super Admin / School Admin, and ordinary use of the Platform by the school's Users).
      </p>

      <h2 className="text-base font-semibold text-slate-900">2. Categories of data processed</h2>
      <p>
        Student and staff identity data (name, email, role, grade/section); academic records (enrollments,
        assignments, submissions, grades, attendance, report cards); communications sent through in-Platform
        messaging; and, where AI features are used, the text submitted to and returned from the configured AI
        provider.
      </p>

      <h2 className="text-base font-semibold text-slate-900">3. Subprocessors</h2>
      <p>
        The Platform relies on infrastructure subprocessors (such as its hosting and database providers) and,
        when a school enables AI features, an AI subprocessor (Google Gemini or Anthropic Claude, as selected by
        the school). A subprocessor is used only to the extent necessary to provide the corresponding feature,
        and is bound by confidentiality and data-protection obligations no less protective than this DPA.
      </p>

      <h2 className="text-base font-semibold text-slate-900">4. Security measures</h2>
      <p>
        Role-based access control scoped to each User's assigned role and school; encrypted credential storage;
        an administrative audit trail covering account, roster, and configuration changes; and school-level data
        isolation, so one school's data is never visible to another school's Users.
      </p>

      <h2 className="text-base font-semibold text-slate-900">5. Data subject requests</h2>
      <p>
        Because the school is the controller, requests from a student, parent, or staff member to access,
        correct, or delete their personal data should be directed to the school. The Platform provides the
        school's administrators with export and deletion tooling to fulfill such requests without needing to
        contact the Platform operator directly for routine cases.
      </p>

      <h2 className="text-base font-semibold text-slate-900">6. Data location and transfers</h2>
      <p>
        Data is hosted with the Platform's infrastructure provider. Where a school operates in a jurisdiction
        with data residency or cross-border transfer requirements (such as the EU/UK GDPR), the school should
        confirm the hosting region and applicable transfer mechanism with the Platform operator before
        onboarding.
      </p>

      <h2 className="text-base font-semibold text-slate-900">7. Data return and deletion on termination</h2>
      <p>
        On termination of a school's account, the school may export its data using the Platform's export tooling
        prior to account closure. Following closure, data is deleted from active systems within a reasonable
        period, subject to any legal or audit retention obligation.
      </p>

      <h2 className="text-base font-semibold text-slate-900">8. Breach notification</h2>
      <p>
        In the event of a confirmed security incident affecting a school's data, the Platform operator will
        notify the school's designated administrator without undue delay so the school can meet its own
        regulatory notification obligations.
      </p>
    </LegalDocumentLayout>
  );
}
