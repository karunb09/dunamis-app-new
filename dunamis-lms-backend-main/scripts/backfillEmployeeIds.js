/**
 * One-time backfill: assign employee IDs to existing staff (superadmin/teacher/admin)
 * in creation-date order. superadmin → DMPL, teacher → DSMT, admin → DSMA.
 *
 * Run from dunamis-lms-backend-main/:
 *   node scripts/backfillEmployeeIds.js
 *
 * Safe to re-run: only users without an employeeId are touched. Reassign
 * mismatches afterwards via the dashboard (PATCH /user/:id/employee-id).
 */

require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../model/user.model");
const { generateEmployeeId } = require("../utils/employeeId");

const PREFIX_BY_ACCOUNT_TYPE = {
  superadmin: "DMPL",
  teacher: "DSMT",
  admin: "DSMA",
};

async function run() {
  await mongoose.connect(process.env.MONGODB_URL, {
    maxPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
  });
  console.log("DB connected");

  const users = await User.find({
    accountType: { $in: Object.keys(PREFIX_BY_ACCOUNT_TYPE) },
    employeeId: { $exists: false },
  })
    .sort({ createdAt: 1 })
    .select("name email accountType createdAt");

  console.log(`Found ${users.length} staff user(s) without an employee ID\n`);

  let assigned = 0;
  for (const user of users) {
    const employeeId = await generateEmployeeId(PREFIX_BY_ACCOUNT_TYPE[user.accountType]);
    await User.updateOne({ _id: user._id }, { $set: { employeeId } });
    const fullName = `${user.name?.firstName || ""} ${user.name?.lastName || ""}`.trim();
    console.log(`  [OK] ${employeeId}  ${user.accountType.padEnd(10)}  ${user.email}  (${fullName})`);
    assigned++;
  }

  console.log(`\nDone — assigned: ${assigned}, skipped (already had ID): everyone else`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
