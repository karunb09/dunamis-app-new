"use strict";

// Today's schedule (User Management): who has a class or demo today, and which
// offline AAs/BDEs are due at an open branch. Classes come from the daily
// attendance report, so empty generated slots never count.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.MAIL_HOST = "";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

const mongoose = require("mongoose");
const Admin = require("../model/admin.model");
const Branch = require("../model/branch.model");
const Course = require("../model/course.model");
const DemoBooking = require("../model/demoBooking.model");
const InstructorCheckIn = require("../model/instructorCheckIn.model");
const Slot = require("../model/slot.model");
const StaffCheckIn = require("../model/staffCheckIn.model");
const Student = require("../model/student.model");
const Teacher = require("../model/teacher.model");
const User = require("../model/user.model");
const { buildTodaySchedule } = require("../services/todaySchedule");
const { getTodaySchedule } = require("../controller/todaySchedule.controller");
const { istDayStart } = require("../utils/istMonth");

const oid = () => new mongoose.Types.ObjectId();

const DAY = "2026-09-15"; // a Tuesday
const MARKER = new Date(Date.UTC(2026, 8, 15));
const NOW = new Date(istDayStart(DAY).getTime() + 12 * 3600000);
const ALL = { instructors: true, students: true, staff: true };

let seq = 0;

async function makeUser(firstName, accountType, extra = {}) {
  seq += 1;
  return User.create({
    name: { firstName, lastName: "Rao" },
    password: "x",
    mobileNo: 9000000000 + seq,
    email: `u${seq}@test.com`,
    accountType,
    ...extra,
  });
}

async function makeTeacher(firstName) {
  const user = await makeUser(firstName, "teacher", { employeeId: `DSMI${String(seq + 1).padStart(3, "0")}` });
  return Teacher.create({ userId: user._id, teacherDetail: oid() });
}

async function makeStudent(firstName) {
  const user = await makeUser(firstName, "student");
  return Student.create({ userId: user._id });
}

async function makeCourse(name) {
  seq += 1;
  return Course.create({ name, code: `C${seq}`, description: "d", category: oid(), subCategory: [oid()] });
}

async function makeBranch(name, openDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]) {
  return Branch.create({
    branchName: name,
    location: "Road No. 1",
    branchManager: oid(),
    branchAdminEmail: "branch@test.com",
    branchAdminContact: "9999999999",
    zone: oid(),
    city: oid(),
    branchTimings: ["10:00", "19:00"],
    branchOpenDays: openDays,
    branchCapacity: 20,
    status: "active",
  });
}

const makeSlot = ({ teacher, course, students = [], slotType = "enrolled", start = "16:00", end = "17:00", date = MARKER, branch }) =>
  Slot.create({
    courseId: course._id,
    date,
    startTime: start,
    endTime: end,
    createdBy: teacher._id,
    slotType,
    sessionType: "standard",
    students: students.map((s) => s._id),
    ...(branch ? { branchId: branch._id } : {}),
  });

const book = (slot, { student = null, lead = {}, demoStatus = "Booked" } = {}) =>
  DemoBooking.collection.insertOne({
    slotId: slot._id,
    studentId: student?._id || null,
    courseId: slot.courseId,
    lead: { firstName: "", lastName: "", ...lead },
    demoStatus,
  });

const visit = (collection, owner, branch, { open = true } = {}) =>
  collection.insertOne({
    ...owner,
    branchId: branch._id,
    dayKey: DAY,
    status: open ? "open" : "closed",
    checkIn: { at: new Date(NOW.getTime() - 3600000), lat: 0, lng: 0, accuracyM: 10 },
    checkOut: open ? null : { at: NOW, lat: 0, lng: 0, accuracyM: 10 },
  });

before(startMemoryMongo);
after(stopMemoryMongo);
beforeEach(clearCollections);

test("lists today's classes and live demo bookings by instructor and by learner", async () => {
  const meera = await makeTeacher("Meera");
  const guitar = await makeCourse("GUITAR");
  const asha = await makeStudent("Asha");
  const ravi = await makeStudent("Ravi");
  const kiran = await makeStudent("Kiran");

  await makeSlot({ teacher: meera, course: guitar, students: [asha, ravi] });
  const demo = await makeSlot({ teacher: meera, course: guitar, slotType: "demo", start: "18:00", end: "18:20" });
  await book(demo, { student: kiran });
  await book(demo, { lead: { firstName: "Guest", lastName: "Visitor" } });
  const cancelled = await makeSlot({ teacher: meera, course: guitar, slotType: "demo", start: "19:00", end: "19:20" });
  await book(cancelled, { student: kiran, demoStatus: "Cancelled" });
  await makeSlot({ teacher: meera, course: guitar, start: "08:00", end: "09:00" }); // empty availability
  await makeSlot({ teacher: meera, course: guitar, students: [asha], date: new Date(Date.UTC(2026, 8, 16)) });

  const today = await buildTodaySchedule({ sections: ALL, now: NOW });

  assert.equal(today.day.key, DAY);
  assert.deepEqual(today.totals, { classes: 1, demos: 1, instructors: 1, students: 4, staff: 0 });

  const [row] = today.instructors;
  assert.equal(row.name, "Meera Rao");
  assert.deepEqual(row.classes.map((c) => [c.kind, c.startTime]), [["class", "16:00"], ["demo", "18:00"]]);
  assert.equal(row.learnerCount, 4);
  assert.equal(row.inPerson, false);
  assert.equal(row.checkIn, null);

  const names = today.students.map((s) => s.name);
  assert.deepEqual(names.slice(0, 2).sort(), ["Asha Rao", "Ravi Rao"]);
  assert.deepEqual(names.slice(2).sort(), ["Guest Visitor", "Kiran Rao"]);
  const guest = today.students.find((s) => s.name === "Guest Visitor");
  assert.equal(guest.studentId, null);
  assert.equal(guest.classes[0].teacherName, "Meera Rao");
  assert.equal(guest.classes[0].learners, undefined);
});

test("offline instructors show today's branch check-in", async () => {
  const meera = await makeTeacher("Meera");
  const branch = await makeBranch("Banjara Hills");
  const course = await makeCourse("DRUMS");
  await makeSlot({ teacher: meera, course, students: [await makeStudent("Asha")], branch });

  let [row] = (await buildTodaySchedule({ sections: ALL, now: NOW })).instructors;
  assert.equal(row.inPerson, true);
  assert.deepEqual(row.checkIn, { status: "none" });

  await visit(InstructorCheckIn.collection, { teacherId: meera._id }, branch);
  [row] = (await buildTodaySchedule({ sections: ALL, now: NOW })).instructors;
  assert.equal(row.checkIn.status, "in");
  assert.equal(row.checkIn.branchName, "Banjara Hills");
});

test("offline AAs and BDEs are listed with the branches open today", async () => {
  const open = await makeBranch("Open Tuesday");
  const closed = await makeBranch("Closed Tuesday", ["saturday", "sunday"]);
  const asha = await makeUser("Asha", "admin", {
    org: { designation: "aa", workMode: "offline", branches: [open._id, closed._id] },
  });
  await makeUser("Weekend", "admin", { org: { designation: "aa", workMode: "offline", branches: [closed._id] } });
  await makeUser("Online", "admin", { org: { designation: "aa", workMode: "online", courses: [oid()] } });
  await makeUser("Finance", "admin", { org: { designation: "financeManager" } });

  let today = await buildTodaySchedule({ sections: ALL, now: NOW });
  assert.equal(today.totals.staff, 1);
  const [row] = today.staff;
  assert.equal(row.name, "Asha Rao");
  assert.equal(row.designation, "aa");
  assert.deepEqual(row.branches.map((b) => b.branchName), ["Open Tuesday"]);
  assert.equal(row.branches[0].opensAt.toISOString(), new Date(istDayStart(DAY).getTime() + 10 * 3600000).toISOString());
  assert.deepEqual(row.checkIn, { status: "none" });

  await visit(StaffCheckIn.collection, { userId: asha._id }, open, { open: false });
  today = await buildTodaySchedule({ sections: ALL, now: NOW });
  assert.equal(today.staff[0].checkIn.status, "out");
  assert.equal(today.staff[0].checkIn.lastOutAt.toISOString(), NOW.toISOString());
});

test("a scoped viewer sees only their area; hidden sections carry no names", async () => {
  const mine = await makeBranch("Mine");
  const other = await makeBranch("Other");
  const meera = await makeTeacher("Meera");
  const course = await makeCourse("VIOLIN");
  await makeSlot({ teacher: meera, course, students: [await makeStudent("Asha")], branch: mine });
  await makeSlot({ teacher: meera, course, students: [await makeStudent("Ravi")], branch: other, start: "18:00", end: "19:00" });
  await makeUser("Elsewhere", "admin", { org: { designation: "aa", workMode: "offline", branches: [other._id] } });

  const today = await buildTodaySchedule({
    area: { branchIds: [mine._id], courseIds: [] },
    sections: { instructors: true, students: false, staff: true },
    now: NOW,
  });

  assert.equal(today.totals.classes, 1);
  assert.equal(today.totals.students, null);
  assert.deepEqual(today.hiddenSections, ["students"]);
  assert.deepEqual(today.students, []);
  assert.deepEqual(today.staff, []);
  const [cls] = today.instructors[0].classes;
  assert.equal(cls.branchName, "Mine");
  assert.equal(cls.learners, undefined);
  assert.equal(cls.learnerCount, 1);
});

test("the endpoint shows each section only to holders of its permission key", async () => {
  const user = await makeUser("Priya", "admin");
  await Admin.create({ userId: user._id, role: "Coordinator", permission: ["instructorManagement"] });

  const res = { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await getTodaySchedule(
    { user: { userId: String(user._id), accountType: "admin" }, query: {}, params: {} },
    res,
    (err) => { if (err) throw err; }
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.hiddenSections, ["students", "staff"]);
});
