/**
 * One-time migration for the running-course billing change.
 *
 *   1. Course.termMonths = 6 wherever it is missing. Every level runs six
 *      months; the payment plan (3/6/12) is a billing cycle, not the term.
 *   2. courseType + termMonths snapshotted onto historical PaymentTransaction
 *      rows and Student.payments[] entries. The dues engine reads courseType
 *      off the snapshot, so without this every pre-existing running-course
 *      enrollment keeps behaving as "fixed" and stops billing at its tenure.
 *
 * Run from dunamis-lms-backend-main/:
 *   node scripts/backfillCourseTerms.js            # dry run, changes nothing
 *   node scripts/backfillCourseTerms.js --confirm  # applies
 *
 * Idempotent — a second run matches 0 documents.
 */

require("dotenv").config();
const mongoose = require("mongoose");

const Course = require("../model/course.model");
const PaymentTransaction = require("../model/paymentTransaction.model");
const Student = require("../model/student.model");

const DEFAULT_TERM_MONTHS = 6;
const apply = process.argv.includes("--confirm");

const report = (label, { matched, modified }) =>
  console.log(`  ${label}: matched ${matched}, ${apply ? "modified" : "would modify"} ${modified}`);

async function run() {
  await mongoose.connect(process.env.MONGODB_URL, {
    maxPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
  });
  console.log(`DB connected — ${apply ? "APPLYING" : "DRY RUN (pass --confirm to apply)"}`);

  const termFilter = { $or: [{ termMonths: { $exists: false } }, { termMonths: null }] };
  const termCount = await Course.countDocuments(termFilter);
  if (apply) {
    const res = await Course.updateMany(termFilter, {
      $set: { termMonths: DEFAULT_TERM_MONTHS },
    });
    report("Course.termMonths", { matched: res.matchedCount, modified: res.modifiedCount });
  } else {
    report("Course.termMonths", { matched: termCount, modified: termCount });
  }

  // Snapshot the course shape onto every historical payment row.
  const courses = await Course.find({}).select("courseType termMonths").lean();
  console.log(`  ${courses.length} course(s) to snapshot from`);

  let txMatched = 0;
  let txModified = 0;
  let payMatched = 0;
  let payModified = 0;

  for (const course of courses) {
    const courseType = course.courseType === "running" ? "running" : "fixed";
    const termMonths = Number(course.termMonths) || DEFAULT_TERM_MONTHS;

    const txFilter = {
      courseId: course._id,
      $or: [{ courseType: { $exists: false } }, { courseType: null }, { termMonths: null }],
    };
    const txCount = await PaymentTransaction.countDocuments(txFilter);
    txMatched += txCount;
    if (apply) {
      const res = await PaymentTransaction.updateMany(txFilter, {
        $set: { courseType, termMonths },
      });
      txModified += res.modifiedCount;
    } else {
      txModified += txCount;
    }

    // Positional-filtered update: one student can hold payments for several
    // courses, and only this course's entries may be touched.
    const payFilter = { "payments.courseId": course._id };
    const payCount = await Student.countDocuments(payFilter);
    payMatched += payCount;
    if (apply) {
      const res = await Student.updateMany(
        payFilter,
        { $set: { "payments.$[entry].courseType": courseType, "payments.$[entry].termMonths": termMonths } },
        { arrayFilters: [{ "entry.courseId": course._id }] }
      );
      payModified += res.modifiedCount;
    } else {
      payModified += payCount;
    }
  }

  report("PaymentTransaction snapshots", { matched: txMatched, modified: txModified });
  report("Student.payments[] snapshots", { matched: payMatched, modified: payModified });

  if (!apply) console.log("\nDry run only. Re-run with --confirm to apply.");
  console.log("Done");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
