const { scheduleWithHeartbeat } = require("../utils/cronHeartbeat");
const { buildMonthlyInsights } = require("../controller/insights.controller");
const { buildMonthlyInsightsEmail } = require("../mail/monthlyInsightsEmail");
const {
  getAdminUsers,
  sendEmails,
  createDashboardNotice,
} = require("../utils/notificationService");
const { currentMonthKey, shiftMonth } = require("../utils/istMonth");

async function sendMonthlyInsightsDigest() {
  try {
    const monthKey = shiftMonth(currentMonthKey(), -1);
    const insights = await buildMonthlyInsights({ monthKey });

    const { subject, html, attachments } = buildMonthlyInsightsEmail({ insights });

    const adminUsers = await getAdminUsers();
    if (!adminUsers.length) {
      console.log("[MonthlyInsights] No admin users found. Skipping email.");
      return;
    }

    const adminEmails = adminUsers.map((u) => u.email).filter(Boolean);
    await sendEmails({ recipients: adminEmails, subject, html, attachments });

    await createDashboardNotice({
      title: "Monthly Insights Report",
      message: `${insights.month.label} — ${insights.growth.studentsRegistered.current} student(s) registered, ${insights.growth.studentsEnrolled.current} new enrollment(s), ${insights.revenue.gross.current.toLocaleString("en-IN")} INR revenue.`,
      userIds: adminUsers.map((u) => u._id),
      contentType: "Transactional",
    });

    console.log(
      `[MonthlyInsights] Sent ${insights.month.label} digest to ${adminEmails.length} admin(s).`
    );
  } catch (err) {
    console.error("[MonthlyInsights] Error:", err.message);
  }
}

// 08:00 IST on the 1st = 02:30 UTC on the 1st. intervalHours ~744 (31 days)
// so ops/status (1.25x threshold) never flags a monthly job as overdue.
scheduleWithHeartbeat("monthlyInsights", "30 2 1 * *", sendMonthlyInsightsDigest, {
  intervalHours: 744,
});

module.exports = { sendMonthlyInsightsDigest };
