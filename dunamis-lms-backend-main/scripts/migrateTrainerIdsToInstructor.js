/**
 * One-time migration: role letter for instructors changed from T (Trainer) to I.
 * Renames DSMT/DSDT/DCCT employee IDs to DSMI/DSDI/DCCI on users, moves the
 * prefix counters, and rewrites any captured referral codes.
 *
 * Run from dunamis-lms-backend-main/:
 *   node scripts/migrateTrainerIdsToInstructor.js
 *
 * Safe to re-run: only *T-prefixed values are touched.
 */

require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../model/user.model");
const Counter = require("../model/counter.model");
const Referral = require("../model/referral.model");
const PaymentTransaction = require("../model/paymentTransaction.model");

const PREFIX_MAP = { DSMT: "DSMI", DSDT: "DSDI", DCCT: "DCCI" };
const T_ID_REGEX = /^(DSM|DSD|DCC)T(\d+)$/;

const toInstructorId = (id) => id.replace(T_ID_REGEX, "$1I$2");

async function run() {
  await mongoose.connect(process.env.MONGODB_URL, {
    maxPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
  });
  console.log("DB connected");

  const users = await User.find({ employeeId: T_ID_REGEX }).select("employeeId email");
  for (const user of users) {
    const next = toInstructorId(user.employeeId);
    await User.updateOne({ _id: user._id }, { $set: { employeeId: next } });
    console.log(`  [USER] ${user.employeeId} -> ${next}  ${user.email}`);
  }

  for (const [from, to] of Object.entries(PREFIX_MAP)) {
    const old = await Counter.findById(from);
    if (!old) continue;
    await Counter.updateOne({ _id: to }, { $max: { seq: old.seq } }, { upsert: true });
    await Counter.deleteOne({ _id: from });
    console.log(`  [COUNTER] ${from} (seq ${old.seq}) -> ${to}`);
  }

  const referrals = await Referral.find({ code: T_ID_REGEX }).select("code");
  for (const referral of referrals) {
    await Referral.updateOne({ _id: referral._id }, { $set: { code: toInstructorId(referral.code) } });
    console.log(`  [REFERRAL] ${referral.code} -> ${toInstructorId(referral.code)}`);
  }

  const transactions = await PaymentTransaction.find({ referralCode: T_ID_REGEX }).select("referralCode");
  for (const tx of transactions) {
    await PaymentTransaction.updateOne({ _id: tx._id }, { $set: { referralCode: toInstructorId(tx.referralCode) } });
    console.log(`  [TXN] ${tx.referralCode} -> ${toInstructorId(tx.referralCode)}`);
  }

  console.log(
    `\nDone — users: ${users.length}, referrals: ${referrals.length}, transactions: ${transactions.length}`
  );
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
