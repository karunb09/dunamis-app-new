/**
 * Backfill: build ClassRoster membership from existing fulfilled enrollments and
 * (re)generate the rolling window of dated slots with students populated, so
 * enrolled students appear in current/upcoming occurrences for attendance and
 * schedule views. Idempotent — safe to re-run.
 *
 * Run from dunamis-lms-backend-main/:
 *   node scripts/backfillClassRoster.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const PaymentTransaction = require("../model/paymentTransaction.model");
const { registerRosterMembership, rollingRange } = require("../utils/classRoster");
const { syncTeacherAvailabilitySlots } = require("../utils/syncAvailabilitySlots");

async function run() {
  await mongoose.connect(process.env.MONGODB_URL, {
    maxPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
  });
  console.log("DB connected\n");

  const transactions = await PaymentTransaction.find({
    status: "fulfilled",
    parentAvailabilityId: { $ne: null },
  }).sort({ createdAt: 1 });

  console.log(`Found ${transactions.length} fulfilled transaction(s) with a recurring class\n`);

  const teacherIds = new Set();
  let registered = 0;
  for (const tx of transactions) {
    try {
      const roster = await registerRosterMembership(tx);
      if (roster) {
        registered += 1;
        teacherIds.add(String(tx.teacherId));
        console.log(
          `  roster ok: student ${String(tx.studentId).slice(-6)} -> class ${String(
            tx.parentAvailabilityId
          ).slice(-6)} (${tx.merchantOrderId})`
        );
      }
    } catch (error) {
      console.log(`  SKIP ${tx.merchantOrderId}: ${error.message}`);
    }
  }

  console.log(`\nRegistered ${registered} membership(s) across ${teacherIds.size} teacher(s).`);
  console.log("Generating rolling-window slots + applying rosters...\n");

  const { rangeStart, rangeEnd } = rollingRange();
  for (const teacherId of teacherIds) {
    const result = await syncTeacherAvailabilitySlots({ teacherId, rangeStart, rangeEnd });
    console.log(`  teacher ${teacherId.slice(-6)}: created ${result.created} slot(s)`);
  }

  await mongoose.disconnect();
  console.log("\nDone.");
}

run().catch((error) => {
  console.error("Backfill failed:", error);
  process.exit(1);
});
