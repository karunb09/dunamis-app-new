const path = require("path");

const LOGO_PATH = path.resolve(__dirname, "../Dunamis.png");
const LOGO_CID = "dunamis-logo";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
};

const buildAssessmentDueEmail = ({ studentName, courseName, dueDate }) => ({
  subject: `Assessment due: ${studentName} — ${courseName}`,
  html: `
  <div style="max-width:640px;margin:0 auto;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;">
    <div style="text-align:center;margin-bottom:20px;">
      <img src="cid:${LOGO_CID}" alt="Dunamis Logo" style="height:36px;width:auto;" />
    </div>
    <div style="background:#ffffff;border-radius:16px;padding:28px;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
      <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#f97316;">Dunamis LMS</p>
      <h1 style="margin:0 0 14px;color:#111827;font-size:24px;line-height:1.25;">6-month assessment due</h1>
      <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.7;">A learner has reached their 6-month assessment. Please schedule and complete it on the dashboard.</p>
      <div style="border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;padding:18px 20px;">
        <p style="margin:0 0 8px;color:#334155;"><strong>Student:</strong> ${escapeHtml(studentName)}</p>
        <p style="margin:0 0 8px;color:#334155;"><strong>Course:</strong> ${escapeHtml(courseName)}</p>
        <p style="margin:0;color:#334155;"><strong>Due date:</strong> ${formatDate(dueDate)}</p>
      </div>
    </div>
  </div>
`,
  attachments: [{ filename: "Dunamis.png", path: LOGO_PATH, cid: LOGO_CID }],
});

const { brandCard, brandAttachments } = require("./emailLayout");

const STUDENT_ASSESSMENTS_URL =
  process.env.STUDENT_ASSESSMENTS_URL || "https://dunamisindia.co.in/student/assessments";

// The learner's side of the same event.
const buildLearnerAssessmentDueEmail = ({ courseName, dueDate }) => ({
  subject: `Your ${courseName} assessment is coming up`,
  html: brandCard({
    title: "Your 6-month assessment",
    intro: `You've reached the 6-month assessment for ${courseName}. Your instructor will take you through it by ${formatDate(dueDate)}.`,
    ctaText: "View my assessments",
    ctaHref: STUDENT_ASSESSMENTS_URL,
    footnote: "Assessments help your instructor plan your next level.",
  }),
  attachments: brandAttachments(),
});

module.exports = { buildAssessmentDueEmail, buildLearnerAssessmentDueEmail };
