/**
 * One-time backfill: students whose User.roleId/roleModel were never set
 * (e.g. accounts created by scripts/seedDatabase.js before it set them —
 * see createStudentUser). Without roleId the website portal can't resolve
 * "who is my Student doc" and shows "Your student profile is not linked
 * to this account yet."
 *
 * Run from dunamis-lms-backend-main/:
 *   node scripts/backfillStudentRoleIds.js
 *
 * Idempotent — a second run matches 0 documents.
 */

require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../model/user.model");
const Student = require("../model/student.model");

async function run() {
  await mongoose.connect(process.env.MONGODB_URL, {
    maxPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
  });
  console.log("DB connected");

  const students = await Student.find({}).select("_id userId").lean();
  let fixed = 0;

  for (const student of students) {
    if (!student.userId) continue;
    const res = await User.updateOne(
      { _id: student.userId, accountType: "student", roleId: { $exists: false } },
      { $set: { roleId: student._id, roleModel: "student" } }
    );
    if (res.modifiedCount > 0) fixed += 1;
  }

  console.log(`Checked ${students.length} students, fixed ${fixed} User.roleId links`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
