const { scheduleWithHeartbeat } = require("../utils/cronHeartbeat");
const Teacher = require("../model/teacher.model");
const { upsertPayout } = require("../controller/remuneration.controller");
const {
  getAdminUsers,
  createDashboardNotice,
} = require("../utils/notificationService");
const { currentMonthKey, monthLabel, shiftMonth } = require("../utils/istMonth");

// Drafts only. Nothing reaches an instructor until an admin approves it in
// Financials, so a bad rate card can never quietly become someone's pay.
async function generateMonthlyPayouts() {
  const month = shiftMonth(currentMonthKey(), -1);
  const teachers = await Teacher.find().select("_id").lean();

  if (!teachers.length) {
    console.log("[InstructorPayout] No instructors found. Skipping.");
    return;
  }

  const records = [];
  for (const teacher of teachers) {
    records.push(await upsertPayout({ teacherId: teacher._id, month }));
  }

  const payable = records.filter((record) => record.totalEarnings > 0);
  const needingRates = records.filter((record) =>
    (record.lines || []).some((line) => line.rateMissing)
  );

  const adminUsers = await getAdminUsers();
  if (adminUsers.length) {
    await createDashboardNotice({
      title: `Instructor payouts ready for review — ${monthLabel(month)}`,
      message:
        `${payable.length} of ${records.length} instructor(s) have earnings to approve.` +
        (needingRates.length
          ? ` ${needingRates.length} payout(s) have lines with no rate card entry and cannot be approved yet.`
          : ""),
      userIds: adminUsers.map((user) => user._id),
      contentType: "Transactional",
    });
  }

  console.log(
    `[InstructorPayout] Generated ${records.length} draft payout(s) for ${month}.`
  );
}

// 06:00 IST on the 1st = 00:30 UTC. intervalHours ~744 (31 days) so ops/status
// does not flag a monthly job as overdue.
scheduleWithHeartbeat("instructorPayout", "30 0 1 * *", generateMonthlyPayouts, {
  intervalHours: 744,
});

module.exports = { generateMonthlyPayouts };
