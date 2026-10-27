"use strict";

// Integration tests for custom schedule days.
//
// Online classes and demos may run on any set of weekdays; offline (branch)
// classes stay on the four fixed day pairs. A custom schedule must generate
// slots on exactly its own weekdays, go through the same overlap and approval
// rules as a pair, and read as one schedule ("Mon, Wed & Fri") to students.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.MAIL_HOST = "";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

const mongoose = require("mongoose");
const User = require("../model/user.model");
const Teacher = require("../model/teacher.model");
const Course = require("../model/course.model");
const Branch = require("../model/branch.model");
const ClassRoster = require("../model/classRoster.model");
const ScheduleChangeRequest = require("../model/scheduleChangeRequest.model");
const Slot = require("../model/slot.model");
const { setWeeklyAvailability, getAvailableSlots } = require("../controller/slot.controller");
const {
  reviewScheduleChangeRequest,
} = require("../controller/scheduleChangeRequest.controller");
const { validateAvailabilityEntries } = require("../utils/availabilityRules");

const oid = () => new mongoose.Types.ObjectId();
let seq = 0;

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const mockRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (body) => ((res.body = body), res);
  return res;
};

const teacherReq = (userId, availability) => ({
  user: { accountType: "teacher", userId },
  body: { availability, replaceExisting: true },
});

const adminReq = (id, body) => ({
  user: { accountType: "admin", userId: oid() },
  params: { id: String(id) },
  body,
});

const makeCourse = (mode = "online") => {
  seq += 1;
  return Course.create({
    name: `Guitar ${seq}`,
    code: `GTR${seq}`,
    description: "Test course",
    mode,
    courseType: "fixed",
    level: "beginner",
    certification: "non-certification",
    startDate: new Date(),
    endDate: new Date(Date.now() + 86400000 * 90),
    image: "x.png",
  });
};

async function seed() {
  seq += 1;
  const user = await User.create({
    name: { firstName: "Ravi", lastName: "Teach" },
    password: "x",
    mobileNo: 9200000000 + seq,
    email: `ravi${seq}@test.com`,
    accountType: "teacher",
  });
  const course = await makeCourse("online");
  const teacher = await Teacher.create({
    userId: user._id,
    teacherDetail: oid(),
    weeklyAvailability: [
      {
        days: ["monday", "thursday"],
        startTime: "17:00",
        endTime: "18:00",
        slotType: "enrolled",
        sessionType: "standard",
        courseId: course._id,
        maxStudents: 5,
      },
    ],
  });
  return { user, course, teacher };
}

const entry = (course, days, overrides = {}) => ({
  days,
  startTime: "19:00",
  endTime: "20:00",
  slotType: "enrolled",
  sessionType: "standard",
  courseId: String(course._id),
  ...overrides,
});

const existing = (teacher) => {
  const saved = teacher.weeklyAvailability[0];
  return {
    _id: String(saved._id),
    days: saved.days,
    startTime: saved.startTime,
    endTime: saved.endTime,
    slotType: saved.slotType,
    sessionType: saved.sessionType,
    courseId: String(saved.courseId),
  };
};

before(async () => {
  await startMemoryMongo();
});

after(async () => {
  await stopMemoryMongo();
});

beforeEach(async () => {
  await clearCollections();
});

test("an online class and demo on custom days save and generate slots only on those days", async () => {
  const { user, course, teacher } = await seed();

  const res = mockRes();
  await setWeeklyAvailability(
    teacherReq(user._id, [
      existing(teacher),
      entry(course, ["monday", "wednesday", "friday"]),
      entry(course, ["saturday"], {
        startTime: "10:00",
        endTime: "10:20",
        slotType: "demo",
      }),
    ]),
    res
  );

  assert.equal(res.statusCode, 200, res.body?.message);
  const saved = (await Teacher.findById(teacher._id)).weeklyAvailability;
  assert.equal(saved.length, 3);

  const custom = saved.find((item) => item.days.length === 3);
  const slots = await Slot.find({ parentAvailabilityId: custom._id });
  // The default window is 21 consecutive days: each weekday exactly three times.
  assert.equal(slots.length, 9);
  for (const slot of slots) {
    assert.ok(
      ["monday", "wednesday", "friday"].includes(WEEKDAYS[slot.date.getDay()]),
      `slot on ${WEEKDAYS[slot.date.getDay()]}`
    );
    assert.deepEqual([...slot.recurringDays], ["monday", "wednesday", "friday"]);
  }

  const demo = saved.find((item) => item.slotType === "demo");
  const demoSlots = await Slot.find({ parentAvailabilityId: demo._id });
  assert.equal(demoSlots.length, 3);
  assert.ok(demoSlots.every((slot) => slot.date.getDay() === 6));
});

test("the same day picked twice is refused", async () => {
  const { user, course } = await seed();

  const res = mockRes();
  await setWeeklyAvailability(
    teacherReq(user._id, [entry(course, ["monday", "monday", "friday"])]),
    res
  );

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, "Each day can only be picked once");
});

test("offline classes stay on day pairs; custom days are online-only", async () => {
  seq += 1;
  const branch = await Branch.create({
    branchName: `Branch ${seq}`,
    location: "Road No. 1",
    branchManager: oid(),
    branchAdminEmail: "branch@test.com",
    branchAdminContact: "9999999999",
    zone: oid(),
    city: oid(),
    branchTimings: ["09:00", "21:00"],
    branchOpenDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
    branchCapacity: 20,
    status: "active",
  });
  const offline = await makeCourse("offline");
  const online = await makeCourse("online");

  const atBranch = await validateAvailabilityEntries([
    entry(offline, ["monday", "wednesday", "friday"], { branchId: String(branch._id) }),
  ]);
  assert.match(atBranch, /only available for online courses/);

  const offlineWithoutBranch = await validateAvailabilityEntries([
    entry(offline, ["saturday"]),
  ]);
  assert.match(offlineWithoutBranch, /only available for online courses/);

  const offlinePair = await validateAvailabilityEntries([
    entry(offline, ["tuesday", "friday"], { branchId: String(branch._id) }),
  ]);
  assert.equal(offlinePair, null);

  const onlineCustom = await validateAvailabilityEntries([
    entry(online, ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]),
  ]);
  assert.equal(onlineCustom, null);
});

test("a custom schedule clashes with a pair that shares a day at the same time", async () => {
  const { user, course, teacher } = await seed();

  const res = mockRes();
  await setWeeklyAvailability(
    teacherReq(user._id, [
      existing(teacher),
      entry(course, ["monday", "wednesday", "friday"], { startTime: "17:00", endTime: "18:00" }),
    ]),
    res
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /Overlap detected on monday/);
});

test("moving an enrolled pair class to custom days waits for approval, then moves", async () => {
  const { user, course, teacher } = await seed();
  const target = teacher.weeklyAvailability[0];
  await ClassRoster.create({
    teacherId: teacher._id,
    courseId: course._id,
    parentAvailabilityId: target._id,
    sessionType: "standard",
    recurringDays: target.days,
    startTime: target.startTime,
    endTime: target.endTime,
    maxStudents: 5,
    students: [{ studentId: oid(), status: "active" }],
  });

  const res = mockRes();
  await setWeeklyAvailability(
    teacherReq(user._id, [
      { ...existing(teacher), days: ["monday", "wednesday", "friday"] },
    ]),
    res
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.pendingApprovals.length, 1);

  const unchanged = (await Teacher.findById(teacher._id)).weeklyAvailability.id(target._id);
  assert.deepEqual([...unchanged.days], ["monday", "thursday"]);

  const request = await ScheduleChangeRequest.findOne({ parentAvailabilityId: target._id });
  const review = mockRes();
  await reviewScheduleChangeRequest(adminReq(request._id, { status: "approved" }), review);
  assert.equal(review.statusCode, 200, review.body?.message);

  const moved = (await Teacher.findById(teacher._id)).weeklyAvailability.id(target._id);
  assert.deepEqual([...moved.days].sort(), ["friday", "monday", "wednesday"]);

  const roster = await ClassRoster.findOne({ parentAvailabilityId: target._id });
  assert.deepEqual([...roster.recurringDays].sort(), ["friday", "monday", "wednesday"]);

  const future = await Slot.find({
    parentAvailabilityId: target._id,
    date: { $gte: new Date() },
  });
  assert.ok(future.length > 0);
  assert.ok(future.every((slot) => slot.date.getDay() !== 4), "no Thursday class left");
});

test("available slots carry one label for the whole schedule", async () => {
  const { user, course, teacher } = await seed();
  await setWeeklyAvailability(
    teacherReq(user._id, [
      existing(teacher),
      entry(course, ["monday", "wednesday", "friday"]),
      entry(course, ["saturday"], { startTime: "09:00", endTime: "10:00" }),
    ]),
    mockRes()
  );

  const res = mockRes();
  await getAvailableSlots({ query: { teacherId: String(teacher._id) } }, res);

  assert.equal(res.statusCode, 200);
  const labelsByTime = new Map(res.body.slots.map((slot) => [slot.startTime, slot.daysLabel]));
  assert.equal(labelsByTime.get("17:00"), "Mon - Thu");
  assert.equal(labelsByTime.get("19:00"), "Mon, Wed & Fri");
  assert.equal(labelsByTime.get("09:00"), "Sat");
});
