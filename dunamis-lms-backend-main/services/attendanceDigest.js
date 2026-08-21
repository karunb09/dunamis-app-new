// Called through the module object rather than destructured: destructuring at
// require time freezes the reference and makes the sender unstubbable, so the
// tests would hit a real SMTP host instead of asserting on the payload.
const notifications = require("../utils/notificationService");
const { buildAttendanceDigestEmail } = require("../mail/attendanceReportEmail");
const { buildDailyAttendanceReport } = require("./attendanceReport");
const { currentDayKey } = require("../utils/istMonth");

async function sendAttendanceDigest() {
  const dayKey = currentDayKey();
  const report = await buildDailyAttendanceReport({ dayKey });

  // The only skip. Silence must mean "no classes existed", never "nothing was
  // recorded" — a day where every class went unmarked is the day the email
  // matters most, and the old digest was the one day it stayed quiet.
  if (!report.totals.classesScheduled) {
    console.log(`[AttendanceDigest] No classes scheduled on ${dayKey}. Skipping.`);
    return;
  }

  const adminUsers = await notifications.getAdminUsers();
  if (!adminUsers.length) {
    console.log("[AttendanceDigest] No admin users found. Skipping email.");
    return;
  }

  const { subject, html, attachments } = buildAttendanceDigestEmail({ report });
  const adminEmails = adminUsers.map((u) => u.email).filter(Boolean);
  await notifications.sendEmails({ recipients: adminEmails, subject, html, attachments });

  const { classesScheduled, fullyMarked, unmarked, partiallyMarked } = report.totals;
  await notifications.createDashboardNotice({
    title: "Daily Attendance Report",
    message: `${fullyMarked} of ${classesScheduled} classes marked. ${unmarked} unmarked, ${partiallyMarked} partial.`,
    userIds: adminUsers.map((u) => u._id),
    contentType: "Transactional",
  });

  console.log(
    `[AttendanceDigest] ${dayKey}: sent to ${adminEmails.length} admin(s). ${unmarked} unmarked of ${classesScheduled}.`
  );
}

module.exports = { sendAttendanceDigest };
