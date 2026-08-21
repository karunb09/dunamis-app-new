"use strict";

// Integration tests for the daily attendance digest.
//
// The behaviour worth pinning is when the email is NOT sent. The old digest
// bailed on `if (!records.length) return`, so the one day where every class went
// unmarked — the day it matters most — was the day it stayed silent. Silence
// must now mean "no classes were scheduled" and nothing else.
//
// Imported from services/, never from cronJobs/ — requiring the .cron.js
// registers a node-cron timer and the test runner never exits.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.MAIL_HOST = "";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

const mongoose = require("mongoose");
const AttendanceHomework = require("../model/attendanceHomework.model");
const Course = require("../model/course.model");
const Slot = require("../model/slot.model");
const Student = require("../model/student.model");
const Teacher = require("../model/teacher.model");
const User = require("../model/user.model");
const AdminNotice = require("../model/adminNotice.model");
const notificationService = require("../utils/notificationService");
const { sendAttendanceDigest } = require("../services/attendanceDigest");
const { buildAttendanceDigestEmail } = require("../mail/attendanceReportEmail");
const { buildDailyAttendanceReport } = require("../services/attendanceReport");
const { currentDayKey, istDayStart } = require("../utils/istMonth");

const oid = () => new mongoose.Types.ObjectId();
// The digest always reports on today, so fixtures must land on today's IST day.
const TODAY_MARKER = istDayStart(currentDayKey());

let seq = 0;
let sent = [];

// Overwrite the export on the module object — services/attendanceDigest.js calls
// through it, so a destructured stub here would silently not apply.
const realSendEmails = notificationService.sendEmails;

async function makeTeacher(firstName = "Meera") {
  const user = await User.create({
    name: { firstName, lastName: "Rao" },
    password: "x",
    mobileNo: 9000000000 + seq++,
    email: `t${seq}@test.com`,
    accountType: "teacher",
  });
  return Teacher.create({ userId: user._id, teacherDetail: oid() });
}

async function makeStudent(firstName = "Asha") {
  const user = await User.create({
    name: { firstName, lastName: "Kumar" },
    password: "x",
    mobileNo: 9100000000 + seq++,
    email: `s${seq}@test.com`,
    accountType: "student",
  });
  return Student.create({ userId: user._id });
}

async function makeAdmin() {
  return User.create({
    name: { firstName: "Admin", lastName: "One" },
    password: "x",
    mobileNo: 9200000000 + seq++,
    email: `admin${seq}@test.com`,
    accountType: "admin",
  });
}

async function makeCourse() {
  return Course.create({
    name: `Course ${seq++}`,
    code: `C${seq}`,
    description: "d",
    category: oid(),
    subCategory: [oid()],
  });
}

async function makeSlot({ teacher, course, students = [] }) {
  return Slot.create({
    courseId: course._id,
    date: TODAY_MARKER,
    startTime: "16:00",
    endTime: "17:00",
    createdBy: teacher._id,
    slotType: "enrolled",
    sessionType: "standard",
    students: students.map((s) => s._id),
  });
}

before(async () => {
  await startMemoryMongo();
  await AttendanceHomework.init();
  notificationService.sendEmails = async (payload) => {
    sent.push(payload);
  };
});
after(async () => {
  notificationService.sendEmails = realSendEmails;
  await stopMemoryMongo();
});
beforeEach(async () => {
  await clearCollections();
  sent = [];
});

test("a day with no classes at all sends nothing", async () => {
  await makeAdmin();

  await sendAttendanceDigest();

  assert.equal(sent.length, 0, "a genuine holiday is the only silence allowed");
});

test("a day where nothing was marked still sends, and says so in the subject", async () => {
  await makeAdmin();
  const teacher = await makeTeacher();
  const course = await makeCourse();
  const student = await makeStudent();
  await makeSlot({ teacher, course, students: [student] });
  await makeSlot({ teacher, course, students: [student] });

  await sendAttendanceDigest();

  assert.equal(sent.length, 1, "total failure must not be silent — the old digest was");
  assert.match(sent[0].subject, /2 classes unmarked/);
  assert.match(sent[0].html, /Classes not marked \(2\)/);
});

test("a fully marked day reports it in the subject", async () => {
  await makeAdmin();
  const teacher = await makeTeacher();
  const course = await makeCourse();
  const student = await makeStudent();
  const slot = await makeSlot({ teacher, course, students: [student] });

  await AttendanceHomework.create({
    teacherId: teacher._id,
    studentId: student._id,
    userId: student.userId,
    courseId: course._id,
    category: oid(),
    subCategory: course.subCategory,
    slotId: slot._id,
    sessionType: "standard",
    attendanceStatus: "Present",
    date: slot.date,
  });

  await sendAttendanceDigest();

  assert.equal(sent.length, 1);
  assert.match(sent[0].subject, /all 1 class marked/);
  assert.match(sent[0].html, /Every class was marked\./);
});

test("the email deep-links to the same day on the report page", async () => {
  const teacher = await makeTeacher();
  const course = await makeCourse();
  const student = await makeStudent();
  await makeSlot({ teacher, course, students: [student] });

  const report = await buildDailyAttendanceReport({ dayKey: currentDayKey() });
  const { html } = buildAttendanceDigestEmail({ report });

  assert.match(html, new RegExp(`/admin/reports/attendance\\?date=${report.day.key}`));
});

test("the dashboard notice can express absence, not just record counts", async () => {
  const admin = await makeAdmin();
  const teacher = await makeTeacher();
  const course = await makeCourse();
  const student = await makeStudent();
  await makeSlot({ teacher, course, students: [student] });

  await sendAttendanceDigest();

  const notice = await AdminNotice.findOne({ title: "Daily Attendance Report" }).lean();
  assert.ok(notice, "admins get a dashboard notice too");
  assert.match(notice.message, /0 of 1 classes marked\. 1 unmarked/);
  assert.equal(String(notice.specificUsers[0]), String(admin._id));
});

test("no admins means no email rather than a crash", async () => {
  const teacher = await makeTeacher();
  const course = await makeCourse();
  const student = await makeStudent();
  await makeSlot({ teacher, course, students: [student] });

  await sendAttendanceDigest();

  assert.equal(sent.length, 0);
});
