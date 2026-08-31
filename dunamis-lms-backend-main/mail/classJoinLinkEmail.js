const { escapeHtml, brandCard, brandAttachments } = require("./emailLayout");

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });

const sessionLabel = (sessionType) =>
  sessionType === "premium" ? "One-to-one session" : "Group session";

// Sent ~15 minutes before an enrolled class starts.
const classJoinLinkEmailTemplate = ({
  studentName,
  courseName,
  instructorName,
  slot,
  meetingLink,
} = {}) => {
  const link = String(meetingLink || "").trim();
  const timeText = `${slot?.startTime} – ${slot?.endTime}`;

  const details = `
    <p style="margin:0 0 12px;color:#0f172a;font-weight:700;font-size:16px;">Your class starts in 15 minutes</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Course:</strong> ${escapeHtml(courseName || "Your course")}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Instructor:</strong> ${escapeHtml(instructorName || "Your instructor")}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Date:</strong> ${escapeHtml(formatDate(slot?.date))}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Time:</strong> ${escapeHtml(timeText)}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Session:</strong> ${escapeHtml(sessionLabel(slot?.sessionType))}</p>
    <p style="margin:0;color:#334155;word-break:break-all;"><strong>Link:</strong> ${escapeHtml(link)}</p>
  `;

  return {
    subject: `Your ${courseName || "Dunamis"} class starts in 15 minutes`,
    html: brandCard({
      title: `Hi ${studentName || "there"}, your class is about to begin`,
      intro:
        "Use the button below to join. It opens the same room your instructor is in, so you can join a couple of minutes early.",
      details,
      ctaText: "Join Class",
      ctaHref: link,
      footnote:
        "If the link does not open, copy it into your browser. Contact the Dunamis team if you cannot join.",
    }),
    attachments: brandAttachments(),
  };
};

module.exports = { classJoinLinkEmailTemplate };
