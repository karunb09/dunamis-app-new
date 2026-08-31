"use strict";

// Integration tests for demo reschedule / cancel.
//
// Two things are load-bearing here. First, demo bookings never write to
// Slot.students, so slot capacity has to be counted from the bookings — without
// that a reschedule happily moves onto an occupied slot and two people hold the
// same 20 minutes. Second, the 24-hour cutoff binds students only: staff move
// demos on the day precisely when something has gone wrong.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.MAIL_HOST = "";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

const mongoose = require("mongoose");
const Course = require("../model/course.model");
const DemoBooking = require("../model/demoBooking.model");
const Slot = require("../model/slot.model");
const Student = require("../model/student.model");
const Teacher = require("../model/teacher.model");
const User = require("../model/user.model");
const {
  rescheduleDemoBooking,
  cancelDemoBooking,
} = require("../controller/demoBooking.controller");

const oid = () => new mongoose.Types.ObjectId();
let seq = 0;

const mockRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (body) => ((res.body = body), res);
  return res;
};

// Slot.date is written as local midnight by syncAvailabilitySlots, and
// startTime is an IST wall-clock string. Build the same shape here so the
// controller's cutoff maths is exercised the way production data hits it.
const dayAndTimeIn = (hoursFromNow) => {
  const target = new Date(Date.now() + hoursFromNow * 3600000);
  const ist = new Date(target.getTime() + 5.5 * 3600000);
  const date = new Date(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
  date.setHours(0, 0, 0, 0);
  const startTime = `${String(ist.getUTCHours()).padStart(2, "0")}:${String(
    ist.getUTCMinutes()
  ).padStart(2, "0")}`;
  return { date, startTime };
};

async function makeUser(firstName, accountType) {
  seq += 1;
  return User.create({
    name: { firstName, lastName: "Test" },
    password: "x",
    mobileNo: 9000000000 + seq,
    email: `${firstName.toLowerCase()}${seq}@test.com`,
    accountType,
  });
}

async function makeTeacher(name = "Meera") {
  const user = await makeUser(name, "teacher");
  const teacher = await Teacher.create({ userId: user._id, teacherDetail: oid() });
  return { user, teacher };
}

async function makeStudent() {
  const user = await makeUser("Asha", "student");
  const student = await Student.create({ userId: user._id });
  return { user, student };
}

async function makeCourse(teacherIds) {
  seq += 1;
  return Course.create({
    name: `Course ${seq}`,
    code: `C${seq}`,
    description: "d",
    category: oid(),
    subCategory: [oid()],
    mode: "online",
    teacher: teacherIds,
  });
}

async function makeDemoSlot({ teacherId, courseId, hoursFromNow }) {
  const { date, startTime } = dayAndTimeIn(hoursFromNow);
  return Slot.create({
    courseId,
    date,
    startTime,
    endTime: startTime,
    createdBy: teacherId,
    slotType: "demo",
    sessionType: "standard",
  });
}

const studentReq = (student, user, body, params) => ({
  user: {
    accountType: "student",
    userId: user._id,
    roleId: student._id,
    email: user.email,
  },
  body,
  params,
});

const adminReq = (user, body, params) => ({
  user: { accountType: "admin", userId: user._id, roleId: user._id, email: user.email },
  body,
  params,
});

before(async () => {
  await startMemoryMongo();
  await DemoBooking.init();
});
after(async () => {
  await stopMemoryMongo();
});
beforeEach(async () => {
  await clearCollections();
});

async function scenario({ hoursFromNow = 72 } = {}) {
  const { teacher } = await makeTeacher("Meera");
  const { teacher: other } = await makeTeacher("Ravi");
  const course = await makeCourse([teacher._id, other._id]);
  const { student, user } = await makeStudent();

  const fromSlot = await makeDemoSlot({
    teacherId: teacher._id,
    courseId: course._id,
    hoursFromNow,
  });
  const toSlot = await makeDemoSlot({
    teacherId: teacher._id,
    courseId: course._id,
    hoursFromNow: hoursFromNow + 24,
  });
  const otherTeacherSlot = await makeDemoSlot({
    teacherId: other._id,
    courseId: course._id,
    hoursFromNow: hoursFromNow + 48,
  });

  const booking = await DemoBooking.create({
    studentId: student._id,
    slotId: fromSlot._id,
    categoryId: course.category,
    courseId: course._id,
    teacherId: teacher._id,
    deliveryMode: "online",
    lead: { firstName: "Asha", lastName: "Test", email: user.email, phone: "9000000000" },
    meetingLink: "https://meet.google.com/old-room",
  });

  return { teacher, other, course, student, user, fromSlot, toSlot, otherTeacherSlot, booking };
}

test("a student can reschedule their own demo outside the 24-hour window", async () => {
  const { student, user, toSlot, booking } = await scenario();

  const res = mockRes();
  await rescheduleDemoBooking(
    studentReq(student, user, { slotId: String(toSlot._id) }, { id: String(booking._id) }),
    res
  );

  assert.equal(res.statusCode, 200);
  const updated = await DemoBooking.findById(booking._id);
  assert.equal(String(updated.slotId), String(toSlot._id));
  assert.equal(updated.demoStatus, "Rescheduled");
  assert.equal(updated.history.length, 1);
  assert.equal(updated.history[0].action, "rescheduled");
  assert.equal(String(updated.history[0].fromSlotId), String(booking.slotId));
});

test("a student cannot reschedule inside the 24-hour window", async () => {
  const { student, user, toSlot, booking } = await scenario({ hoursFromNow: 5 });

  const res = mockRes();
  await rescheduleDemoBooking(
    studentReq(student, user, { slotId: String(toSlot._id) }, { id: String(booking._id) }),
    res
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /24 hours/);
  assert.ok(res.body.hint, "the cutoff error carries an IT-support hint");

  const untouched = await DemoBooking.findById(booking._id);
  assert.equal(String(untouched.slotId), String(booking.slotId));
});

test("an admin can reschedule inside the 24-hour window", async () => {
  const { toSlot, booking } = await scenario({ hoursFromNow: 5 });
  const admin = await makeUser("Nina", "admin");

  const res = mockRes();
  await rescheduleDemoBooking(
    adminReq(admin, { slotId: String(toSlot._id) }, { id: String(booking._id) }),
    res
  );

  assert.equal(res.statusCode, 200);
  const updated = await DemoBooking.findById(booking._id);
  assert.equal(String(updated.slotId), String(toSlot._id));
});

test("moving to another instructor's slot reassigns and clears the stale join link", async () => {
  const { student, user, other, otherTeacherSlot, booking } = await scenario();

  const res = mockRes();
  await rescheduleDemoBooking(
    studentReq(
      student,
      user,
      { slotId: String(otherTeacherSlot._id) },
      { id: String(booking._id) }
    ),
    res
  );

  assert.equal(res.statusCode, 200);
  const updated = await DemoBooking.findById(booking._id);
  assert.equal(String(updated.teacherId), String(other._id));
  assert.equal(updated.meetingLink, "", "the previous instructor's room must not carry over");
  assert.equal(updated.meetingLinkUpdatedAt, null);
  assert.equal(updated.history[0].action, "reassigned");
});

test("a demo slot already held by someone else cannot be taken", async () => {
  const { course, teacher, toSlot, student, user, booking } = await scenario();

  const { student: rival } = await makeStudent();
  await DemoBooking.create({
    studentId: rival._id,
    slotId: toSlot._id,
    categoryId: course.category,
    courseId: course._id,
    teacherId: teacher._id,
    deliveryMode: "online",
    lead: { firstName: "Rival", lastName: "T", email: "rival@test.com", phone: "9000000001" },
  });

  const res = mockRes();
  await rescheduleDemoBooking(
    studentReq(student, user, { slotId: String(toSlot._id) }, { id: String(booking._id) }),
    res
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /already booked/);
});

test("a cancelled booking frees its slot for someone else", async () => {
  const { course, teacher, toSlot, student, user, booking } = await scenario();

  const { student: rival } = await makeStudent();
  const rivalBooking = await DemoBooking.create({
    studentId: rival._id,
    slotId: toSlot._id,
    categoryId: course.category,
    courseId: course._id,
    teacherId: teacher._id,
    deliveryMode: "online",
    lead: { firstName: "Rival", lastName: "T", email: "rival@test.com", phone: "9000000001" },
  });

  const cancelRes = mockRes();
  await cancelDemoBooking(
    { user: { accountType: "admin", userId: user._id, roleId: user._id, email: user.email },
      body: { reason: "Rival dropped out" },
      params: { id: String(rivalBooking._id) } },
    cancelRes
  );
  assert.equal(cancelRes.statusCode, 200);

  const cancelled = await DemoBooking.findById(rivalBooking._id);
  assert.equal(cancelled.demoStatus, "Cancelled");
  assert.equal(cancelled.cancelReason, "Rival dropped out");
  assert.ok(cancelled.cancelledAt);

  const res = mockRes();
  await rescheduleDemoBooking(
    studentReq(student, user, { slotId: String(toSlot._id) }, { id: String(booking._id) }),
    res
  );
  assert.equal(res.statusCode, 200, "the freed slot is bookable again");
});

test("a student cannot touch someone else's booking", async () => {
  const { toSlot, booking } = await scenario();
  const { student: outsider, user: outsiderUser } = await makeStudent();

  const res = mockRes();
  await rescheduleDemoBooking(
    studentReq(
      outsider,
      outsiderUser,
      { slotId: String(toSlot._id) },
      { id: String(booking._id) }
    ),
    res
  );

  assert.equal(res.statusCode, 403);
});

test("a guest who signed up later still owns the demo they booked by email", async () => {
  const { course, teacher, toSlot, fromSlot } = await scenario();

  // Booked as a lead: no studentId on the row at all.
  const guestBooking = await DemoBooking.create({
    slotId: fromSlot._id,
    categoryId: course.category,
    courseId: course._id,
    teacherId: teacher._id,
    deliveryMode: "online",
    lead: { firstName: "Late", lastName: "Signup", email: "late@test.com", phone: "9000000002" },
  });

  const { student: nowRegistered } = await makeStudent();
  const res = mockRes();
  await rescheduleDemoBooking(
    {
      user: {
        accountType: "student",
        userId: oid(),
        roleId: nowRegistered._id,
        email: "late@test.com",
      },
      body: { slotId: String(toSlot._id) },
      params: { id: String(guestBooking._id) },
    },
    res
  );

  assert.equal(res.statusCode, 200);
});

test("a cancelled demo cannot be rescheduled", async () => {
  const { student, user, toSlot, booking } = await scenario();
  await DemoBooking.findByIdAndUpdate(booking._id, { demoStatus: "Cancelled" });

  const res = mockRes();
  await rescheduleDemoBooking(
    studentReq(student, user, { slotId: String(toSlot._id) }, { id: String(booking._id) }),
    res
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /cancelled/);
});
