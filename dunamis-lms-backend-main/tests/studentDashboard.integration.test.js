"use strict";

// Integration tests for the student Overview/Performance endpoint.
//
// The load-bearing claim is "next class": it is chosen by IST calendar day, not
// the server's local midnight, and a class that already finished today is not
// next. Getting either wrong shows a learner yesterday's class with a dead link.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.MAIL_HOST = "";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

const mongoose = require("mongoose");
const Assessment = require("../model/assessment.model");
const AttendanceHomework = require("../model/attendanceHomework.model");
const ClassRoster = require("../model/classRoster.model");
const Course = require("../model/course.model");
const Slot = require("../model/slot.model");
const Student = require("../model/student.model");
const Teacher = require("../model/teacher.model");
const User = require("../model/user.model");
const { getMyDashboard } = require("../controller/studentDashboard.controller");
const { currentDayKey, istDayStart, shiftDay } = require("../utils/istMonth");

const oid = () => new mongoose.Types.ObjectId();
const HOUR_MS = 3600000;
let seq = 0;

const makeRes = () => {
  const res = { statusCode: 200, payload: null };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (payload) => ((res.payload = payload), res);
  return res;
};

const run = async (userId) => {
  const res = makeRes();
  await getMyDashboard({ user: { accountType: "student", userId } }, res, (err) => {
    if (err) throw err;
  });
  return res;
};

// Slot dates in this app sit a few hours into the IST day, as the generator
// writes them.
const istDay = (offset) => new Date(istDayStart(shiftDay(currentDayKey(), offset)).getTime() + 9.5 * HOUR_MS);

let studentUser;
let student;
let teacher;
let course;

before(async () => {
  await startMemoryMongo();
});

after(async () => {
  await stopMemoryMongo();
});

beforeEach(async () => {
  await clearCollections();
  seq += 1;

  studentUser = await User.create({
    name: { firstName: "Ira", lastName: "Joshi" },
    password: "x",
    mobileNo: 9700000000 + seq,
    email: `ira${seq}@example.com`,
    accountType: "student",
  });
  student = await Student.create({ userId: studentUser._id });

  const teacherUser = await User.create({
    name: { firstName: "Gaurav", lastName: "Sharma" },
    password: "x",
    mobileNo: 9800000000 + seq,
    email: `gaurav${seq}@example.com`,
    accountType: "teacher",
  });
  teacher = await Teacher.create({ userId: teacherUser._id, teacherDetail: oid() });

  course = await Course.create({ name: "Drawing Essentials", code: `DRW-${seq}`, level: "beginner" });
});

const slotOn = (offset, { startTime = "16:00", endTime = "17:00", parentAvailabilityId = null, meetingLinkOverride = "" } = {}) =>
  Slot.create({
    courseId: course._id,
    createdBy: teacher._id,
    date: istDay(offset),
    startTime,
    endTime,
    slotType: "enrolled",
    sessionType: "standard",
    students: [student._id],
    parentAvailabilityId,
    meetingLinkOverride,
  });

test("yesterday's class is never the next class", async () => {
  await slotOn(-1);
  const tomorrow = await slotOn(1);

  const res = await run(studentUser._id);

  assert.equal(res.statusCode, 200);
  assert.equal(new Date(res.payload.nextClass.date).getTime(), tomorrow.date.getTime());
});

test("a class that already ended today is skipped", async () => {
  // "00:00" has always passed, whenever the test runs.
  await slotOn(0, { startTime: "00:00", endTime: "00:00" });
  const tomorrow = await slotOn(1);

  const res = await run(studentUser._id);

  assert.equal(new Date(res.payload.nextClass.date).getTime(), tomorrow.date.getTime());
});

test("a class still to come today is the next class", async () => {
  // "23:59" has not passed until the very last minute of the IST day.
  const later = await slotOn(0, { startTime: "23:00", endTime: "23:59" });
  await slotOn(1);

  const res = await run(studentUser._id);

  assert.equal(new Date(res.payload.nextClass.date).getTime(), later.date.getTime());
  assert.equal(res.payload.nextClass.instructorName, "Gaurav Sharma");
});

test("the join link comes from the roster, and a per-session override wins", async () => {
  const parentAvailabilityId = oid();
  await ClassRoster.create({
    teacherId: teacher._id,
    courseId: course._id,
    parentAvailabilityId,
    sessionType: "standard",
    startTime: "16:00",
    endTime: "17:00",
    meetingLink: "https://meet.example.com/standing-room",
    students: [{ studentId: student._id, status: "active" }],
  });

  const slot = await slotOn(1, { parentAvailabilityId });
  let res = await run(studentUser._id);
  assert.equal(res.payload.nextClass.meetingLink, "https://meet.example.com/standing-room");

  await Slot.updateOne({ _id: slot._id }, { $set: { meetingLinkOverride: "https://meet.example.com/moved-today" } });
  res = await run(studentUser._id);
  assert.equal(res.payload.nextClass.meetingLink, "https://meet.example.com/moved-today");
});

test("no upcoming class means no next class", async () => {
  await slotOn(-3);

  const res = await run(studentUser._id);

  assert.equal(res.payload.nextClass, null);
});

test("performance totals attendance and surfaces the open assessment", async () => {
  for (const status of ["Present", "Present", "Present", "Absent"]) {
    await AttendanceHomework.create({
      teacherId: teacher._id,
      studentId: student._id,
      userId: studentUser._id,
      courseId: course._id,
      category: oid(),
      subCategory: oid(),
      slotId: oid(),
      sessionType: "standard",
      attendanceStatus: status,
      homework: "Shade the sphere study",
      date: istDay(-2),
    });
  }
  await Assessment.create({
    studentId: student._id,
    courseId: course._id,
    teacherId: teacher._id,
    dueDate: istDay(5),
    status: "Sent",
    sentAt: new Date(),
    questionnaire: { title: "Six-month review", questions: [] },
  });

  const res = await run(studentUser._id);
  const { attendance } = res.payload.performance;

  assert.equal(attendance.present, 3);
  assert.equal(attendance.total, 4);
  assert.equal(attendance.rate, 75);
  assert.equal(res.payload.openAssessment.title, "Six-month review");
  assert.equal(res.payload.latestHomework.homework, "Shade the sphere study");
});
