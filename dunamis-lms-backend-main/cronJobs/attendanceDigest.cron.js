const cron = require("node-cron");
const AttendanceHomework = require("../model/attendanceHomework.model");
const {
  getAdminUsers,
  sendEmails,
  createDashboardNotice,
} = require("../utils/notificationService");
const { buildAttendanceDigestEmail } = require("../mail/attendanceReportEmail");

async function sendAttendanceDigest() {
  try {
    // IST is UTC+5:30. Compute today's window in UTC that corresponds to midnight–midnight IST.
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // 5h 30m in ms

    const todayIST = new Date(now.getTime() + istOffset);
    todayIST.setUTCHours(0, 0, 0, 0);
    const tomorrowIST = new Date(todayIST.getTime() + 24 * 60 * 60 * 1000);

    const todayStart = new Date(todayIST.getTime() - istOffset);
    const todayEnd = new Date(tomorrowIST.getTime() - istOffset);

    const records = await AttendanceHomework.find({
      createdAt: { $gte: todayStart, $lt: todayEnd },
    })
      .populate({
        path: "teacherId",
        select: "userId name",
        populate: { path: "userId", select: "name email" },
      })
      .populate("courseId", "name")
      .populate({
        path: "studentId",
        select: "userId",
        populate: { path: "userId", select: "name" },
      })
      .lean();

    if (!records.length) {
      console.log("[AttendanceDigest] No attendance records for today. Skipping.");
      return;
    }

    // Group by teacherId
    const teacherMap = new Map();
    for (const record of records) {
      const teacherKey = record.teacherId?._id?.toString() || "unknown";
      const teacherName =
        record.teacherId?.userId?.name ||
        record.teacherId?.name ||
        "Unknown Instructor";
      const teacherEmail = record.teacherId?.userId?.email || null;

      if (!teacherMap.has(teacherKey)) {
        teacherMap.set(teacherKey, { teacherName, teacherEmail, records: [] });
      }

      teacherMap.get(teacherKey).records.push({
        courseName: record.courseId?.name || "N/A",
        studentName: record.studentId?.userId?.name || "Unknown",
        attendanceStatus: record.attendanceStatus || "Unknown",
        homework: record.homework || "",
        sessionType: record.sessionType || "",
      });
    }

    const sections = Array.from(teacherMap.values());
    const { html, attachments } = buildAttendanceDigestEmail({
      date: now,
      sections,
    });

    const subject = `Daily Attendance Report — ${now.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    })}`;

    const adminUsers = await getAdminUsers();
    if (!adminUsers.length) {
      console.log("[AttendanceDigest] No admin users found. Skipping email.");
      return;
    }

    const adminEmails = adminUsers.map((u) => u.email).filter(Boolean);
    await sendEmails({ recipients: adminEmails, subject, html, attachments });

    await createDashboardNotice({
      title: "Daily Attendance Report",
      message: `${records.length} attendance record(s) submitted today across ${sections.length} instructor(s).`,
      userIds: adminUsers.map((u) => u._id),
      contentType: "Transactional",
    });

    console.log(
      `[AttendanceDigest] Sent to ${adminEmails.length} admin(s). ${records.length} records.`
    );
  } catch (err) {
    console.error("[AttendanceDigest] Error:", err.message);
  }
}

// 10:00 PM IST = 16:30 UTC
cron.schedule("30 16 * * *", sendAttendanceDigest, {
  timezone: "UTC",
});

module.exports = { sendAttendanceDigest };
