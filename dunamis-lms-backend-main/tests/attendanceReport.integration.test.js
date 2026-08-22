"use strict";

// Integration tests for buildDailyAttendanceReport.
//
// The report exists to answer "which classes did nobody mark?", so the tests
// that matter most are the ones proving it can see a class with zero attendance
// records (#1), that it buckets by class date rather than submission date (#2),
// and that its day window catches the Slot.date marker under either plausible
// server timezone (#3). Imported from services/, never from cronJobs/ — a
// require of a .cron.js registers a node-cron timer and the runner never exits.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.MAIL_HOST = "";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

const mongoose = require("mongoose");
const AttendanceHomework = require("../model/attendanceHomework.model");
const ClassRoster = require("../model/classRoster.model");
const Course = require("../model/course.model");
const Slot = require("../model/slot.model");
const Student = require("../model/student.model");
const Teacher = require("../model/teacher.model");
const User = require("../model/user.model");
const { buildDailyAttendanceReport } = require("../services/attendanceReport");
const { IST_OFFSET_MS } = require("../utils/istMonth");

const oid = () => new mongoose.Types.ObjectId();

const DAY = "2026-08-22";
// The marker a UTC-clock server writes for that calendar day.
const UTC_MARKER = new Date(Date.UTC(2026, 7, 22));
// The marker an IST-clock server writes for the same calendar day.
const IST_MARKER = new Date(Date.UTC(2026, 7, 22) - IST_OFFSET_MS);

let seq = 0;

async function makeTeacher(firstName = "Meera") {
  const user = await User.create({
    name: { firstName, lastName: "Rao" },
    password: "x",
    mobileNo: 9000000000 + seq++,
    email: `t${seq}@test.com`,
    accountType: "teacher",
    employeeId: `DSMI${String(seq).padStart(3, "0")}`,
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

async function makeCourse(name = "Carnatic Vocal") {
  return Course.create({
    name: `${name} ${seq++}`,
    code: `C${seq}`,
    description: "d",
    category: oid(),
    subCategory: [oid()],
  });
}

async function makeSlot({
  teacher,
  course,
  students = [],
  date = UTC_MARKER,
  slotType = "enrolled",
  sessionType = "standard",
  parentAvailabilityId,
}) {
  return Slot.create({
    courseId: course._id,
    date,
    startTime: "16:00",
    endTime: "17:00",
    createdBy: teacher._id,
    slotType,
    sessionType,
    students: students.map((s) => s._id),
    parentAvailabilityId,
  });
}

async function mark({ teacher, course, slot, student, attendanceStatus = "Present", homework = "", date, createdAt }) {
  const row = await AttendanceHomework.create({
    teacherId: teacher._id,
    studentId: student._id,
    userId: student.userId,
    courseId: course._id,
    category: oid(),
    subCategory: course.subCategory,
    slotId: slot._id,
    sessionType: slot.sessionType,
    attendanceStatus,
    homework,
    date: date || slot.date,
  });
  if (createdAt) {
    // createdAt is immutable through Mongoose; go through the raw driver.
    await AttendanceHomework.collection.updateOne({ _id: row._id }, { $set: { createdAt } });
  }
  return row;
}

before(async () => {
  await startMemoryMongo();
  await AttendanceHomework.init();
});
after(async () => {
  await stopMemoryMongo();
});
beforeEach(async () => {
  await clearCollections();
});

test("a class nobody marked still appears, flagged Missing", async () => {
  const teacher = await makeTeacher();
  const course = await makeCourse();
  const students = [await makeStudent(), await makeStudent(), await makeStudent(), await makeStudent()];
  await makeSlot({ teacher, course, students });

  const report = await buildDailyAttendanceReport({ dayKey: DAY });

  assert.equal(report.totals.classesScheduled, 1);
  assert.equal(report.totals.unmarked, 1, "the defect the old digest could not see");
  assert.equal(report.classes[0].coverageStatus, "Missing");
  assert.equal(report.classes[0].expectedStudents, 4);
  assert.equal(report.classes[0].markedStudents, 0);
  assert.equal(
    report.classes[0].students.filter((s) => !s.marked).length,
    4,
    "every expected student is listed as unmarked"
  );
});

test("attendance is bucketed by class date, not submission date", async () => {
  const teacher = await makeTeacher();
  const course = await makeCourse();
  const student = await makeStudent();
  const slot = await makeSlot({ teacher, course, students: [student] });

  // Marked the following afternoon — the old digest filed this under the 23rd.
  await mark({ teacher, course, slot, student, createdAt: new Date("2026-08-23T09:00:00.000Z") });

  const onDay = await buildDailyAttendanceReport({ dayKey: DAY });
  const nextDay = await buildDailyAttendanceReport({ dayKey: "2026-08-23" });

  assert.equal(onDay.totals.studentsMarked, 1, "counted on the day the class ran");
  assert.equal(onDay.classes[0].coverageStatus, "Full");
  assert.equal(onDay.classes[0].markedLate, true, "late entry is surfaced, not hidden");
  assert.equal(nextDay.totals.classesScheduled, 0, "and not on the day it was typed in");
});

test("the day window catches the Slot.date marker under either server timezone", async () => {
  const teacher = await makeTeacher();
  const course = await makeCourse();
  const student = await makeStudent();

  await makeSlot({ teacher, course, students: [student], date: UTC_MARKER });
  await makeSlot({ teacher, course, students: [student], date: IST_MARKER });

  const onDay = await buildDailyAttendanceReport({ dayKey: DAY });
  const before = await buildDailyAttendanceReport({ dayKey: "2026-08-21" });
  const after = await buildDailyAttendanceReport({ dayKey: "2026-08-23" });

  assert.equal(onDay.totals.classesScheduled, 2, "both markers land on the IST day");
  assert.equal(before.totals.classesScheduled, 0);
  assert.equal(after.totals.classesScheduled, 0);
});

test("the join is on slotId, so a mis-dated record is still counted", async () => {
  const teacher = await makeTeacher();
  const course = await makeCourse();
  const student = await makeStudent();
  const slot = await makeSlot({ teacher, course, students: [student] });

  // Legacy row stamped with its submission date instead of the class date.
  await mark({ teacher, course, slot, student, date: new Date("2026-08-25T00:00:00.000Z") });

  const report = await buildDailyAttendanceReport({ dayKey: DAY });

  assert.equal(report.totals.studentsMarked, 1, "a date window would have dropped this");
  assert.equal(report.classes[0].coverageStatus, "Full");
});

test("a half-marked class reads Partial with the right counts", async () => {
  const teacher = await makeTeacher();
  const course = await makeCourse();
  const students = [await makeStudent(), await makeStudent(), await makeStudent(), await makeStudent()];
  const slot = await makeSlot({ teacher, course, students });

  await mark({ teacher, course, slot, student: students[0], attendanceStatus: "Present", homework: "Scales." });
  await mark({ teacher, course, slot, student: students[1], attendanceStatus: "Absent" });

  const report = await buildDailyAttendanceReport({ dayKey: DAY });
  const [row] = report.classes;

  assert.equal(row.coverageStatus, "Partial");
  assert.equal(row.expectedStudents, 4);
  assert.equal(row.markedStudents, 2);
  assert.equal(row.present, 1);
  assert.equal(row.absent, 1);
  assert.equal(row.homeworkCount, 1);
  assert.equal(report.totals.partiallyMarked, 1);
  assert.equal(report.totals.unmarked, 0, "partial is not unmarked");
});

test("demo slots are out of scope", async () => {
  const teacher = await makeTeacher();
  const course = await makeCourse();
  const student = await makeStudent();
  await makeSlot({ teacher, course, students: [student], slotType: "demo", sessionType: "premium" });

  const report = await buildDailyAttendanceReport({ dayKey: DAY });

  assert.equal(report.totals.classesScheduled, 0);
});

test("a slot with nobody enrolled is not a class and is not reported", async () => {
  const teacher = await makeTeacher();
  const course = await makeCourse();
  const student = await makeStudent();
  await makeSlot({ teacher, course, students: [] });
  await makeSlot({ teacher, course, students: [student] });

  const report = await buildDailyAttendanceReport({ dayKey: DAY });

  // Slots are generated from teacher availability, so most occurrences never
  // had a student. Counting them buried the real classes 15:1 on prod.
  assert.equal(report.totals.classesScheduled, 1, "only the slot with a student counts");
  assert.equal(report.classes.length, 1);
  assert.equal(report.totals.unmarked, 1);
});

test("an empty slot falls back to its active roster", async () => {
  const teacher = await makeTeacher();
  const course = await makeCourse();
  const active = await makeStudent();
  const removed = await makeStudent();
  const parentAvailabilityId = oid();

  await makeSlot({ teacher, course, students: [], parentAvailabilityId });
  await ClassRoster.create({
    teacherId: teacher._id,
    courseId: course._id,
    parentAvailabilityId,
    sessionType: "standard",
    startTime: "16:00",
    endTime: "17:00",
    students: [
      { studentId: active._id, status: "active" },
      { studentId: removed._id, status: "removed" },
    ],
  });

  const report = await buildDailyAttendanceReport({ dayKey: DAY });
  const [row] = report.classes;

  assert.equal(row.expectedSource, "roster");
  assert.equal(row.expectedStudents, 1, "removed members are not expected");
  assert.equal(row.coverageStatus, "Missing");
});

test("totals add up and the rates follow them", async () => {
  const teacher = await makeTeacher();
  const course = await makeCourse();
  const students = [await makeStudent(), await makeStudent(), await makeStudent(), await makeStudent()];
  const slot = await makeSlot({ teacher, course, students });

  await mark({ teacher, course, slot, student: students[0] });
  await mark({ teacher, course, slot, student: students[1] });
  await mark({ teacher, course, slot, student: students[2], attendanceStatus: "Absent" });

  const { totals } = await buildDailyAttendanceReport({ dayKey: DAY });

  assert.equal(totals.present + totals.absent, totals.studentsMarked);
  assert.equal(totals.studentsExpected, 4);
  assert.equal(totals.markingRate, 75);
  assert.equal(totals.attendanceRate, round1((2 / 3) * 100));

  function round1(n) {
    return Math.round(n * 10) / 10;
  }
});

test("byInstructor rolls up per teacher, worst coverage first", async () => {
  const covered = await makeTeacher("Ravi");
  const delinquent = await makeTeacher("Nisha");
  const course = await makeCourse();
  const student = await makeStudent();

  const done = await makeSlot({ teacher: covered, course, students: [student] });
  await mark({ teacher: covered, course, slot: done, student });
  await makeSlot({ teacher: delinquent, course, students: [student] });
  await makeSlot({ teacher: delinquent, course, students: [student] });

  const { byInstructor } = await buildDailyAttendanceReport({ dayKey: DAY });

  assert.equal(byInstructor.length, 2);
  assert.equal(byInstructor[0].teacherName, "Nisha Rao", "the one needing action sorts first");
  assert.equal(byInstructor[0].unmarked, 2);
  assert.equal(byInstructor[1].fullyMarked, 1);
});

test("teacherId and courseId narrow the report", async () => {
  const mine = await makeTeacher("Ravi");
  const other = await makeTeacher("Nisha");
  const courseA = await makeCourse("Guitar");
  const courseB = await makeCourse("Piano");
  const student = await makeStudent();

  await makeSlot({ teacher: mine, course: courseA, students: [student] });
  await makeSlot({ teacher: mine, course: courseB, students: [student] });
  await makeSlot({ teacher: other, course: courseA, students: [student] });

  const byTeacher = await buildDailyAttendanceReport({ dayKey: DAY, teacherId: mine._id });
  const byCourse = await buildDailyAttendanceReport({ dayKey: DAY, courseId: courseA._id });

  assert.equal(byTeacher.totals.classesScheduled, 2);
  assert.equal(byCourse.totals.classesScheduled, 2);
});

test("bounds span the first scheduled class to today", async () => {
  const teacher = await makeTeacher();
  const course = await makeCourse();
  await makeSlot({ teacher, course, date: new Date(Date.UTC(2026, 5, 1)) });
  await makeSlot({ teacher, course, date: UTC_MARKER });

  const { bounds } = await buildDailyAttendanceReport({ dayKey: DAY });

  assert.equal(bounds.earliest, "2026-06-01");
  assert.equal(bounds.latest, require("../utils/istMonth").currentDayKey());
});

test("an empty day reports zeroes rather than failing", async () => {
  const report = await buildDailyAttendanceReport({ dayKey: DAY });

  assert.equal(report.success, true);
  assert.equal(report.partial, false);
  assert.equal(report.totals.classesScheduled, 0);
  assert.deepEqual(report.classes, []);
  assert.equal(report.totals.markingRate, null, "no base means no rate, not 0%");
});
