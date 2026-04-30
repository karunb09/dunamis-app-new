import LegalPolicyPage, { Section } from "@/compoents/LegalPolicyPage";

export default function RefundPolicyPage() {
  return (
    <LegalPolicyPage
      title="Cancellation & Refund Policy"
      updatedAt="28-04-2026 07:15:27"
      downloadHref="/DMPL-Website-Cancellation-Refund-Policy%20.pdf"
      downloadLabel="Download Policy PDF"
      intro="Dunamis Music Private Limited values its learners and strives to maintain a fair and transparent cancellation and refund process."
    >
      <Section title="1. Cancellation Requests">
        <ul className="list-disc space-y-3 pl-5">
          <li>
            Cancellations will be considered only if the request is made within <strong>24 hours of enrolment/payment</strong> for a class, course, or subscription.
          </li>
          <li>
            Once classes have commenced or digital access has been provided, cancellation requests will not be entertained.
          </li>
        </ul>
      </Section>

      <Section title="2. Non-Cancellable Services">
        <ul className="list-disc space-y-3 pl-5">
          <li>
            Enrolments for <strong>short-term workshops, trial classes, or special events</strong> are non-cancellable.
          </li>
          <li>
            Customized services such as <strong>personalized lesson plans, one-on-one sessions, or tailored curriculum packages</strong> cannot be cancelled once scheduled.
          </li>
        </ul>
      </Section>

      <Section title="3. Refunds & Replacements">
        <p>Refunds may be considered if:</p>
        <ul className="list-disc space-y-3 pl-5">
          <li>
            The student experiences <strong>technical issues</strong> preventing access to classes, and the issue cannot be resolved by our support team.
          </li>
          <li>
            The quality of teaching/service delivered is demonstrably below the promised standard.
          </li>
          <li>
            Requests must be reported to our <strong>Student Support Team within 2 days</strong> of the first class/session.
          </li>
          <li>Our team will review the complaint and take an appropriate decision.</li>
        </ul>
      </Section>

      <Section title="4. Third-Party Services & Certifications">
        <ul className="list-disc space-y-3 pl-5">
          <li>
            For courses that include <strong>third-party learning materials, certifications, or partner platforms</strong>, any issues must be addressed directly with the respective provider.
          </li>
        </ul>
      </Section>

      <Section title="5. Refund Timeline">
        <ul className="list-disc space-y-3 pl-5">
          <li>
            If a refund is approved, it will be processed within <strong>9-15 working days</strong> to the original payment method.
          </li>
        </ul>
      </Section>
    </LegalPolicyPage>
  );
}
