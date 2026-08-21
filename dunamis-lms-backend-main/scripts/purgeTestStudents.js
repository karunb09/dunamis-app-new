/**
 * Hard-delete student test accounts and every trace of them.
 *
 * Dry-runs by default (prints exactly what it would touch). Pass --confirm to
 * actually write. Emails may be passed as args; otherwise EMAILS below is used.
 *
 *   node scripts/purgeTestStudents.js
 *   node scripts/purgeTestStudents.js --confirm
 *   node scripts/purgeTestStudents.js --confirm a@x.com b@y.com
 *
 * Refuses to run against a user whose accountType is not "student".
 */

require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../model/user.model");
const Student = require("../model/student.model");
const Teacher = require("../model/teacher.model");
const Slot = require("../model/slot.model");
const ClassRoster = require("../model/classRoster.model");
const DemoBooking = require("../model/demoBooking.model");
const PaymentTransaction = require("../model/paymentTransaction.model");
const Referral = require("../model/referral.model");
const Assignment = require("../model/assignment.model");
const Assessment = require("../model/assessment.model");
const AttendanceHomework = require("../model/attendanceHomework.model");
const Feedback = require("../model/feedback.model");
const Class = require("../model/class.model");
const AdminNotice = require("../model/adminNotice.model");
const Enquiry = require("../model/enquiry.model");
const CallbackRequest = require("../model/callbackRequest.model");
const MailLog = require("../model/log.model");
const Otp = require("../model/otp.model");

const EMAILS = [
  "gaurinandan13@gmail.com",
  "dorianwonders2025@gmail.com",
  "jadron2302@gmail.com",
  "websitesdiana@gmail.com",
];

const APPLY = process.argv.includes("--confirm");
const argEmails = process.argv.slice(2).filter((a) => a.includes("@"));
const targets = (argEmails.length ? argEmails : EMAILS).map((e) => e.trim().toLowerCase());

const rx = (email) => new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

async function purgeOne(email, log) {
  const user = await User.findOne({ email: rx(email) });
  if (!user) {
    log(`  user: NOT FOUND — nothing to delete`);
    return;
  }
  if (user.accountType !== "student") {
    log(`  ABORT: accountType is "${user.accountType}", not "student". Skipped.`);
    return;
  }

  const student = await Student.findOne({ userId: user._id });
  const userId = user._id;
  const studentId = student?._id || null;

  log(`  user     ${userId}  ${user.name?.firstName} ${user.name?.lastName}  mobile=${user.mobileNo}`);
  log(`  student  ${studentId || "(no student doc)"}`);

  const sid = studentId ? { studentId } : null;

  const deletions = [
    ["PaymentTransaction", PaymentTransaction, { $or: [{ userId }, ...(sid ? [sid] : [])] }],
    ["Referral", Referral, sid],
    ["DemoBooking", DemoBooking, { $or: [...(sid ? [sid] : []), { "lead.email": rx(email) }] }],
    ["Assignment", Assignment, sid],
    ["Assessment", Assessment, sid],
    ["AttendanceHomework", AttendanceHomework, { $or: [{ userId }, ...(sid ? [sid] : [])] }],
    ["Feedback", Feedback, sid],
    ["Class", Class, sid],
    ["Enquiry", Enquiry, { email: rx(email) }],
    ["CallbackRequest", CallbackRequest, { phone: String(user.mobileNo) }],
    ["MailLog", MailLog, { to: rx(email) }],
    ["Otp", Otp, { email: rx(email) }],
  ];

  for (const [name, Model, filter] of deletions) {
    if (!filter) continue;
    const n = await Model.countDocuments(filter);
    if (!n) continue;
    log(`  delete   ${name}: ${n}`);
    if (APPLY) await Model.deleteMany(filter);
  }

  if (studentId) {
    const slots = await Slot.find({ students: studentId }).select("_id students currentStudentsCount");
    if (slots.length) {
      log(`  pull     Slot.students: ${slots.length} slot(s)`);
      if (APPLY) {
        for (const s of slots) {
          const next = s.students.filter((x) => String(x) !== String(studentId));
          await Slot.updateOne(
            { _id: s._id },
            { $set: { students: next, currentStudentsCount: next.length } }
          );
        }
      }
    }

    const rosters = await ClassRoster.find({ "students.studentId": studentId }).select("_id");
    if (rosters.length) {
      log(`  pull     ClassRoster.students: ${rosters.length} roster(s)`);
      if (APPLY) {
        await ClassRoster.updateMany(
          { "students.studentId": studentId },
          { $pull: { students: { studentId } } }
        );
      }
    }

    const teachers = await Teacher.find({
      $or: [{ students: studentId }, { "weeklyAvailability.students": studentId }],
    });
    if (teachers.length) {
      log(`  pull     teacher.students + weeklyAvailability[].students: ${teachers.length} teacher(s)`);
      if (APPLY) {
        for (const t of teachers) {
          t.students = (t.students || []).filter((x) => String(x) !== String(studentId));
          for (const av of t.weeklyAvailability || []) {
            av.students = (av.students || []).filter((x) => String(x) !== String(studentId));
          }
          t.studentCount = t.students.length;
          await t.save();
        }
      }
    }
  }

  const notices = await AdminNotice.countDocuments({
    $or: [{ specificUsers: userId }, { readBy: userId }, { deletedBy: userId }],
  });
  if (notices) {
    log(`  pull     adminNotice user refs: ${notices} notice(s)`);
    if (APPLY) {
      await AdminNotice.updateMany(
        { $or: [{ specificUsers: userId }, { readBy: userId }, { deletedBy: userId }] },
        { $pull: { specificUsers: userId, readBy: userId, deletedBy: userId } }
      );
    }
  }

  const orphanNotices = await AdminNotice.countDocuments({ creator: userId });
  if (orphanNotices) log(`  WARN     ${orphanNotices} adminNotice doc(s) created by this user — left in place, review manually`);

  if (studentId) {
    log(`  delete   student doc`);
    if (APPLY) await Student.deleteOne({ _id: studentId });
  }
  log(`  delete   user doc`);
  if (APPLY) await User.deleteOne({ _id: userId });
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URL, { maxPoolSize: 2, serverSelectionTimeoutMS: 10000 });
  const host = mongoose.connection.host;
  const db = mongoose.connection.name;
  console.log(`DB connected: ${host}/${db}`);
  console.log(APPLY ? "MODE: APPLY (writes are real)\n" : "MODE: DRY RUN (no writes)\n");

  const lines = [];
  const log = (s) => {
    lines.push(s);
    console.log(s);
  };

  for (const email of targets) {
    log(`\n=== ${email} ===`);
    await purgeOne(email, log);
  }

  console.log(APPLY ? "\nDone — records deleted." : "\nDry run complete. Re-run with --confirm to delete.");
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
