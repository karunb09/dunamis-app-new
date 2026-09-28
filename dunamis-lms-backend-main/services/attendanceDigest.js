// Called through the module object rather than destructured: destructuring at
// require time freezes the reference and makes the sender unstubbable, so the
// tests would hit a real SMTP host instead of asserting on the payload.
const notifications = require("../utils/notificationService");
const { buildAttendanceDigestEmail } = require("../mail/attendanceReportEmail");
const { buildDailyAttendanceReport, summarizeClasses } = require("./attendanceReport");
const { loadRoutingDirectory, resolveStaff } = require("./staffRouting");
const { currentDayKey } = require("../utils/istMonth");

// Splits the day's classes between the staff responsible for them (the
// sheet's "daily attendance report" row). A class nobody covers climbs the
// AA → BDE → BDM → Marketing Head ladder like any other message.
const shareClasses = ({ classes, rule, directory }) => {
  const shares = new Map();
  let fellBack = false;
  for (const item of classes) {
    const context = item.branchId ? { branchId: item.branchId } : { courseId: item.courseId };
    const routed = resolveStaff({ columns: rule, context, directory });
    fellBack = fellBack || routed.fellBack;
    for (const person of routed.recipients) {
      const key = String(person._id);
      if (!shares.has(key)) shares.set(key, { person, classes: [] });
      shares.get(key).classes.push(item);
    }
  }
  return { shares: [...shares.values()], fellBack };
};

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

  const rule = await notifications.getRule("dailyAttendanceReport");
  if (!rule?.aa && !rule?.bde) {
    console.log("[AttendanceDigest] Nobody is ticked for the daily report. Skipping.");
    return;
  }

  const directory = await loadRoutingDirectory();
  const { shares, fellBack } = shareClasses({ classes: report.classes, rule, directory });
  if (fellBack) {
    console.warn("[AttendanceDigest] Some classes have nobody placed over them — sent to every active admin");
  }

  for (const { person, classes } of shares) {
    const share = { ...report, ...summarizeClasses(classes), classes };
    if (rule.channel === "email") {
      const { subject, html, attachments } = buildAttendanceDigestEmail({ report: share });
      await notifications.sendEmails({ recipients: [person.email], subject, html, attachments });
    } else {
      const { classesScheduled, fullyMarked, unmarked, partiallyMarked } = share.totals;
      await notifications.createDashboardNotice({
        title: "Daily Attendance Report",
        message: `${fullyMarked} of ${classesScheduled} classes marked. ${unmarked} unmarked, ${partiallyMarked} partial.`,
        userIds: [person._id],
        contentType: "Transactional",
      });
    }
  }

  console.log(
    `[AttendanceDigest] ${dayKey}: ${shares.length} recipient(s). ${report.totals.unmarked} unmarked of ${report.totals.classesScheduled}.`
  );
}

module.exports = { sendAttendanceDigest };
