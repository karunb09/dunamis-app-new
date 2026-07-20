/**
 * One-time migration: student follow-up statuses "complete" → "completed"
 * (enum changed to pending/contacted/completed).
 *
 * Run from dunamis-lms-backend-main/:
 *   node scripts/migrateFollowUpStatuses.js
 *
 * Idempotent — a second run matches 0 documents.
 */

require("dotenv").config();
const mongoose = require("mongoose");

const Student = require("../model/student.model");

async function run() {
  await mongoose.connect(process.env.MONGODB_URL, {
    maxPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
  });
  console.log("DB connected");

  for (const key of ["followUp1", "followUp2", "followUp3"]) {
    const res = await Student.updateMany(
      { [`followUps.${key}`]: "complete" },
      { $set: { [`followUps.${key}`]: "completed" } }
    );
    console.log(`  ${key}: matched ${res.matchedCount}, modified ${res.modifiedCount}`);
  }

  console.log("Done");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
