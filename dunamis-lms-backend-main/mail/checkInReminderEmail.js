const { escapeHtml, brandCard, brandAttachments } = require("./emailLayout");

const DASHBOARD_URL = process.env.DASHBOARD_URL || "https://dashboard.dunamisindia.co.in";
const CHECK_IN_URL = `${DASHBOARD_URL}/teacher/check-in`;

const formatTime = (value) =>
  new Date(value).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

const line = (label, value) =>
  `<p style="margin:0 0 8px;color:#334155;"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`;

const classLine = (cls) =>
  `${cls.courseName}${cls.slotType === "demo" ? " (demo)" : ""}, ${formatTime(cls.startAt)} – ${formatTime(cls.endAt)}`;

// Sent at the first 5-minute tick after an offline class starts with no check-in.
const buildMissingCheckInEmail = ({ teacherName, branchName, classes }) => {
  const first = classes[0];
  return {
    subject: `You haven't checked in at ${branchName}`,
    html: brandCard({
      title: `Hi ${teacherName}, you haven't checked in`,
      intro: `Your class at ${branchName} started at ${formatTime(first.startAt)} and there is no check-in from you yet. Open the dashboard at the branch and tap Check in — the time is recorded when you tap.`,
      details: [
        line("Branch", branchName),
        ...classes.map((cls) => line("Class", classLine(cls))),
      ].join(""),
      ctaText: "Check in now",
      ctaHref: CHECK_IN_URL,
      footnote:
        "Check-ins are recorded with your location and cannot be edited later. If you are not taking this class, tell the admin team.",
    }),
    attachments: brandAttachments(),
  };
};

// Sent 30 minutes after the last class of an open visit ended (or after the
// stand-in end time when no class was scheduled).
const buildMissingCheckOutEmail = ({
  teacherName,
  branchName,
  checkInAt,
  lastClassEndAt,
  expectedCheckOutAt,
}) => ({
  subject: `You haven't checked out of ${branchName}`,
  html: brandCard({
    title: `Hi ${teacherName}, you haven't checked out`,
    intro: `You checked in at ${branchName} at ${formatTime(checkInAt)}. If you have left, check out now — you can do it from anywhere, and it will be marked as a late logout. If you are still at the branch, check out when you leave.`,
    details: [
      line("Branch", branchName),
      line("Checked in", formatTime(checkInAt)),
      lastClassEndAt
        ? line("Last class ended", formatTime(lastClassEndAt))
        : line("Expected to leave by", formatTime(expectedCheckOutAt)),
    ].join(""),
    ctaText: "Check out now",
    ctaHref: CHECK_IN_URL,
    footnote:
      "Check-out closes at midnight. After that, only the admin team can record when you left.",
  }),
  attachments: brandAttachments(),
});

module.exports = { buildMissingCheckInEmail, buildMissingCheckOutEmail };
