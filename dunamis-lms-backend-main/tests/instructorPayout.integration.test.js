"use strict";

// Integration tests for the instructor payout engine.
//
// The load-bearing assertions are the money ones: a learner who attended 6 of
// 8 sessions earns the instructor 6/8 of the rate, a five-week month never pays
// over 100%, and a category with no rate card row surfaces as rateMissing
// rather than silently paying zero.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.MAIL_HOST = "";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

const mongoose = require("mongoose");
const AttendanceHomework = require("../model/attendanceHomework.model");
const Category = require("../model/category.model");
const Course = require("../model/course.model");
const DemoBooking = require("../model/demoBooking.model");
const InstructorRate = require("../model/instructorRate.model");
const Student = require("../model/student.model");
const Teacher = require("../model/teacher.model");
const User = require("../model/user.model");
const { buildInstructorPayout } = require("../services/instructorPayout");

const MONTH = "2026-08";
const oid = () => new mongoose.Types.ObjectId();

let teacherId;
let vocalsId;
let danceId;
let beginnerCourseId;
let danceCourseId;

// IST day inside MONTH, as the UTC instant the model stores.
const dayInMonth = (day) =>
  new Date(Date.UTC(2026, 7, day, 6, 0, 0));

const makeStudent = async (firstName) => {
  const user = await User.create({
    name: { firstName, lastName: "Learner" },
    email: `${firstName.toLowerCase()}@example.com`,
    password: "Dunamis@123",
    mobileNo: 9000000000,
    accountType: "student",
  });
  const student = await Student.create({ userId: user._id });
  return student._id;
};

const markAttendance = async ({
  studentId,
  courseId,
  categoryId,
  sessionType,
  days,
  attendanceStatus = "Present",
}) => {
  for (const day of days) {
    await AttendanceHomework.create({
      teacherId,
      studentId,
      userId: oid(),
      courseId,
      category: categoryId,
      subCategory: oid(),
      slotId: oid(),
      sessionType,
      attendanceStatus,
      date: dayInMonth(day),
    });
  }
};

before(async () => {
  await startMemoryMongo();
});

after(async () => {
  await stopMemoryMongo();
});

beforeEach(async () => {
  await clearCollections();

  const teacherUser = await User.create({
    name: { firstName: "Nidhi", lastName: "Rao" },
    email: "nidhi@example.com",
    password: "Dunamis@123",
    mobileNo: 9111111111,
    accountType: "teacher",
    employeeId: "DSMI001",
  });
  const teacher = await Teacher.create({
    userId: teacherUser._id,
    teacherDetail: oid(),
  });
  teacherId = teacher._id;

  const [vocals, dance] = await Category.create([
    { name: "Vocals" },
    { name: "Dance" },
  ]);
  vocalsId = vocals._id;
  danceId = dance._id;

  const [vocalsCourse, danceCourse] = await Course.create([
    { name: "Carnatic Vocals", code: "VOC-101", category: vocalsId, level: "beginner" },
    { name: "Bharatanatyam", code: "DAN-101", category: danceId, level: "beginner" },
  ]);
  beginnerCourseId = vocalsCourse._id;
  danceCourseId = danceCourse._id;

  await InstructorRate.create([
    {
      categoryId: vocalsId,
      level: "beginner",
      sessionType: "standard",
      ratePerLearnerMonth: 750,
      sessionsPerMonth: 8,
    },
    {
      categoryId: vocalsId,
      level: "beginner",
      sessionType: "premium",
      ratePerLearnerMonth: 1000,
      sessionsPerMonth: 8,
    },
  ]);
});

test("a learner is paid pro-rata on the sessions they attended", async () => {
  const studentId = await makeStudent("Asha");
  await markAttendance({
    studentId,
    courseId: beginnerCourseId,
    categoryId: vocalsId,
    sessionType: "standard",
    days: [1, 4, 8, 11, 15, 18],
  });

  const payout = await buildInstructorPayout({ teacherId, month: MONTH });

  assert.equal(payout.lines.length, 1);
  const [line] = payout.lines;
  assert.equal(line.sessionsAttended, 6);
  assert.equal(line.sessionsPerMonth, 8);
  assert.equal(line.rate, 750);
  // 750 * 6/8
  assert.equal(line.amount, 563);
  assert.equal(payout.totalEarnings, 563);
  assert.equal(line.rateMissing, false);
});

test("absences are not paid, and a full month pays the full rate", async () => {
  const present = await makeStudent("Bala");
  const absent = await makeStudent("Chitra");

  await markAttendance({
    studentId: present,
    courseId: beginnerCourseId,
    categoryId: vocalsId,
    sessionType: "standard",
    days: [1, 4, 8, 11, 15, 18, 22, 25],
  });
  await markAttendance({
    studentId: absent,
    courseId: beginnerCourseId,
    categoryId: vocalsId,
    sessionType: "standard",
    days: [1, 4],
    attendanceStatus: "Absent",
  });

  const payout = await buildInstructorPayout({ teacherId, month: MONTH });

  assert.equal(payout.lines.length, 1, "an absent learner earns no line");
  assert.equal(payout.lines[0].amount, 750);
  assert.equal(payout.groupStudents, 1);
});

test("a five-week month never pays more than one full month", async () => {
  const studentId = await makeStudent("Deepa");
  await markAttendance({
    studentId,
    courseId: beginnerCourseId,
    categoryId: vocalsId,
    sessionType: "standard",
    days: [1, 4, 8, 11, 15, 18, 22, 25, 29, 31],
  });

  const payout = await buildInstructorPayout({ teacherId, month: MONTH });

  assert.equal(payout.lines[0].sessionsAttended, 10);
  assert.equal(payout.lines[0].amount, 750);
});

test("group and individual sessions are priced separately", async () => {
  const groupLearner = await makeStudent("Esha");
  const soloLearner = await makeStudent("Farid");

  await markAttendance({
    studentId: groupLearner,
    courseId: beginnerCourseId,
    categoryId: vocalsId,
    sessionType: "standard",
    days: [1, 4, 8, 11, 15, 18, 22, 25],
  });
  await markAttendance({
    studentId: soloLearner,
    courseId: beginnerCourseId,
    categoryId: vocalsId,
    sessionType: "premium",
    days: [2, 5, 9, 12],
  });

  const payout = await buildInstructorPayout({ teacherId, month: MONTH });

  const group = payout.lines.find((l) => l.sessionType === "standard");
  const solo = payout.lines.find((l) => l.sessionType === "premium");

  assert.equal(group.amount, 750);
  assert.equal(solo.amount, 500); // 1000 * 4/8
  assert.equal(payout.groupStudents, 1);
  assert.equal(payout.individualStudents, 1);
  assert.equal(payout.totalEarnings, 1250);
});

test("a category with no rate card row is flagged, not silently zeroed", async () => {
  const studentId = await makeStudent("Gita");
  await markAttendance({
    studentId,
    courseId: danceCourseId,
    categoryId: danceId,
    sessionType: "standard",
    days: [1, 4, 8, 11],
  });

  const payout = await buildInstructorPayout({ teacherId, month: MONTH });

  assert.equal(payout.lines.length, 1);
  assert.equal(payout.lines[0].rateMissing, true);
  assert.equal(payout.lines[0].amount, 0);
  assert.equal(payout.rateMissingCount, 1);
});

test("converted demos add the one-time bonus; unconverted ones do not", async () => {
  await DemoBooking.create([
    {
      slotId: oid(),
      categoryId: vocalsId,
      courseId: beginnerCourseId,
      teacherId,
      enrollmentStatus: "Enrolled",
      convertedAt: dayInMonth(9),
    },
    {
      slotId: oid(),
      categoryId: vocalsId,
      courseId: beginnerCourseId,
      teacherId,
      enrollmentStatus: "Not Enrolled",
    },
  ]);

  const payout = await buildInstructorPayout({ teacherId, month: MONTH });

  assert.equal(payout.demoConversions, 1);
  assert.equal(payout.demoAmount, 100);
  assert.equal(payout.totalEarnings, 100);
});

test("attendance outside the month is not counted", async () => {
  const studentId = await makeStudent("Hari");
  await markAttendance({
    studentId,
    courseId: beginnerCourseId,
    categoryId: vocalsId,
    sessionType: "standard",
    days: [4, 8],
  });
  await AttendanceHomework.create({
    teacherId,
    studentId,
    userId: oid(),
    courseId: beginnerCourseId,
    category: vocalsId,
    subCategory: oid(),
    slotId: oid(),
    sessionType: "standard",
    attendanceStatus: "Present",
    // 1 Sep IST — the next cycle.
    date: new Date(Date.UTC(2026, 8, 1, 6, 0, 0)),
  });

  const payout = await buildInstructorPayout({ teacherId, month: MONTH });

  assert.equal(payout.lines[0].sessionsAttended, 2);
});

test("the payout is due on the 7th of the following month", async () => {
  const payout = await buildInstructorPayout({ teacherId, month: MONTH });

  // IST midnight on 7 Sep 2026 = 6 Sep 18:30 UTC.
  assert.equal(payout.payDueDate.toISOString(), "2026-09-06T18:30:00.000Z");
});
