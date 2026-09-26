"use strict";

// Integration tests for weekly-availability saves.
//
// The load-bearing claim is that a save never changes a recurring class's
// weeklyAvailability subdocument _id, because ClassRoster is keyed by it: a new
// id orphans the roster and blanks the class for every enrolled learner. The
// second claim is that a change to a class which has enrolled learners is
// queued for admin approval instead of being applied.
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
const ClassRoster = require("../model/classRoster.model");
const ScheduleChangeRequest = require("../model/scheduleChangeRequest.model");
const Slot = require("../model/slot.model");
const { setWeeklyAvailability } = require("../controller/slot.controller");
const {
  reviewScheduleChangeRequest,
} = require("../controller/scheduleChangeRequest.controller");

const oid = () => new mongoose.Types.ObjectId();
let seq = 0;

const mockRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (body) => ((res.body = body), res);
  return res;
};

const teacherReq = (userId, availability, extra = {}) => ({
  user: { accountType: "teacher", userId },
  body: { availability, replaceExisting: true, ...extra },
});

async function seed() {
  seq += 1;
  const user = await User.create({
    name: { firstName: "Sara", lastName: "Teach" },
    password: "x",
    mobileNo: 9100000000 + seq,
    email: `sara${seq}@test.com`,
    accountType: "teacher",
  });

  const course = await Course.create({
    name: `Violin ${seq}`,
    code: `VLN${seq}`,
    description: "Test course",
    mode: "online",
    courseType: "fixed",
    level: "beginner",
    certification: "non-certification",
    startDate: new Date(),
    endDate: new Date(Date.now() + 86400000 * 90),
    image: "x.png",
  });

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
      {
        days: ["tuesday", "friday"],
        startTime: "19:00",
        endTime: "20:00",
        slotType: "enrolled",
        sessionType: "standard",
        courseId: course._id,
        maxStudents: 5,
      },
    ],
  });

  return { user, course, teacher };
}

const asPayload = (entry, overrides = {}) => ({
  days: entry.days,
  startTime: entry.startTime,
  endTime: entry.endTime,
  slotType: entry.slotType,
  sessionType: entry.sessionType,
  courseId: String(entry.courseId),
  ...overrides,
});

const addRoster = async ({ teacher, course, entry, studentId = oid() }) =>
  ClassRoster.create({
    teacherId: teacher._id,
    courseId: course._id,
    parentAvailabilityId: entry._id,
    sessionType: entry.sessionType,
    recurringDays: entry.days,
    startTime: entry.startTime,
    endTime: entry.endTime,
    maxStudents: 5,
    students: [{ studentId, status: "active" }],
  });

before(async () => {
  await startMemoryMongo();
});

after(async () => {
  await stopMemoryMongo();
});

beforeEach(async () => {
  await clearCollections();
});

test("a no-op re-save keeps every availability _id, even without client ids", async () => {
  const { user, teacher } = await seed();
  const before = teacher.weeklyAvailability.map((entry) => String(entry._id));

  const res = mockRes();
  await setWeeklyAvailability(
    teacherReq(
      user._id,
      teacher.weeklyAvailability.map((entry) => asPayload(entry))
    ),
    res
  );

  assert.equal(res.statusCode, 200);
  const after = (await Teacher.findById(teacher._id)).weeklyAvailability.map((entry) =>
    String(entry._id)
  );
  assert.deepEqual(after, before);
});

test("a client-sent _id survives a time edit on a class with no learners", async () => {
  const { user, teacher } = await seed();
  const target = teacher.weeklyAvailability[0];

  const res = mockRes();
  await setWeeklyAvailability(
    teacherReq(user._id, [
      asPayload(target, { _id: String(target._id), startTime: "16:00", endTime: "17:00" }),
      asPayload(teacher.weeklyAvailability[1], {
        _id: String(teacher.weeklyAvailability[1]._id),
      }),
    ]),
    res
  );

  assert.equal(res.statusCode, 200);
  const saved = (await Teacher.findById(teacher._id)).weeklyAvailability.id(target._id);
  assert.ok(saved, "entry kept its _id");
  assert.equal(saved.startTime, "16:00");
  assert.equal(await ScheduleChangeRequest.countDocuments(), 0);
});

test("a change to a class with enrolled learners is queued, not applied", async () => {
  const { user, course, teacher } = await seed();
  const target = teacher.weeklyAvailability[0];
  await addRoster({ teacher, course, entry: target });

  const res = mockRes();
  await setWeeklyAvailability(
    teacherReq(user._id, [
      asPayload(target, { _id: String(target._id), startTime: "16:00", endTime: "17:00" }),
      asPayload(teacher.weeklyAvailability[1], {
        _id: String(teacher.weeklyAvailability[1]._id),
      }),
    ]),
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.pendingApprovals.length, 1);

  const saved = (await Teacher.findById(teacher._id)).weeklyAvailability.id(target._id);
  assert.equal(saved.startTime, "17:00", "current timing is untouched until approval");

  const request = await ScheduleChangeRequest.findOne({ parentAvailabilityId: target._id });
  assert.equal(request.status, "pending");
  assert.equal(request.changeType, "reschedule");
  assert.equal(request.requested.startTime, "16:00");
  assert.equal(request.affectedStudentIds.length, 1);
});

test("dropping a class with enrolled learners queues a removal and keeps the class", async () => {
  const { user, course, teacher } = await seed();
  const target = teacher.weeklyAvailability[0];
  await addRoster({ teacher, course, entry: target });

  const res = mockRes();
  await setWeeklyAvailability(
    teacherReq(user._id, [
      asPayload(teacher.weeklyAvailability[1], {
        _id: String(teacher.weeklyAvailability[1]._id),
      }),
    ]),
    res
  );

  assert.equal(res.statusCode, 200);
  const saved = (await Teacher.findById(teacher._id)).weeklyAvailability.id(target._id);
  assert.ok(saved, "class stays on the schedule until an admin approves the removal");

  const request = await ScheduleChangeRequest.findOne({ parentAvailabilityId: target._id });
  assert.equal(request.changeType, "remove");
  assert.equal(request.status, "pending");
});

test("re-saving the same guarded change reuses the open request", async () => {
  const { user, course, teacher } = await seed();
  const target = teacher.weeklyAvailability[0];
  await addRoster({ teacher, course, entry: target });

  const payload = [
    asPayload(target, { _id: String(target._id), startTime: "16:00", endTime: "17:00" }),
    asPayload(teacher.weeklyAvailability[1], {
      _id: String(teacher.weeklyAvailability[1]._id),
    }),
  ];

  await setWeeklyAvailability(teacherReq(user._id, payload), mockRes());
  await setWeeklyAvailability(teacherReq(user._id, payload), mockRes());

  assert.equal(await ScheduleChangeRequest.countDocuments({ status: "pending" }), 1);
});

const adminReq = (adminId, id, body) => ({
  user: { accountType: "admin", userId: adminId },
  params: { id: String(id) },
  body,
});

const queueTimeChange = async ({ user, course, teacher }) => {
  const target = teacher.weeklyAvailability[0];
  await addRoster({ teacher, course, entry: target });
  await setWeeklyAvailability(
    teacherReq(user._id, [
      asPayload(target, { _id: String(target._id), startTime: "16:00", endTime: "17:00" }),
      asPayload(teacher.weeklyAvailability[1], {
        _id: String(teacher.weeklyAvailability[1]._id),
      }),
    ]),
    mockRes()
  );
  return {
    target,
    request: await ScheduleChangeRequest.findOne({ parentAvailabilityId: target._id }),
  };
};

test("approving a reschedule moves the class and leaves no class at the old time", async () => {
  const seeded = await seed();
  const { target, request } = await queueTimeChange(seeded);

  const before = await Slot.countDocuments({
    parentAvailabilityId: target._id,
    startTime: "17:00",
    date: { $gte: new Date() },
  });
  assert.ok(before > 0, "old-time occurrences exist before approval");

  const res = mockRes();
  await reviewScheduleChangeRequest(
    adminReq(oid(), request._id, { status: "approved", adminNote: "ok" }),
    res
  );

  assert.equal(res.statusCode, 200);

  const entry = (await Teacher.findById(seeded.teacher._id)).weeklyAvailability.id(target._id);
  assert.equal(entry.startTime, "16:00", "class moved, keeping its _id");

  const roster = await ClassRoster.findOne({ parentAvailabilityId: target._id });
  assert.equal(roster.startTime, "16:00", "roster snapshot followed the move");

  const oldRemaining = await Slot.countDocuments({
    parentAvailabilityId: target._id,
    startTime: "17:00",
    date: { $gte: new Date() },
  });
  assert.equal(oldRemaining, 0, "no future occurrence left at the old time");

  const moved = await Slot.countDocuments({
    parentAvailabilityId: target._id,
    startTime: "16:00",
  });
  assert.ok(moved > 0, "occurrences regenerated at the new time");

  const reviewed = await ScheduleChangeRequest.findById(request._id);
  assert.equal(reviewed.status, "approved");
  assert.equal(reviewed.current.startTime, "17:00", "audit keeps what it moved from");
});

test("rejecting leaves the timetable untouched and records the note", async () => {
  const seeded = await seed();
  const { target, request } = await queueTimeChange(seeded);

  const res = mockRes();
  await reviewScheduleChangeRequest(
    adminReq(oid(), request._id, { status: "rejected", adminNote: "clashes with recital" }),
    res
  );

  assert.equal(res.statusCode, 200);
  const entry = (await Teacher.findById(seeded.teacher._id)).weeklyAvailability.id(target._id);
  assert.equal(entry.startTime, "17:00");

  const reviewed = await ScheduleChangeRequest.findById(request._id);
  assert.equal(reviewed.status, "rejected");
  assert.equal(reviewed.adminNote, "clashes with recital");
});

test("a request cannot be reviewed twice", async () => {
  const seeded = await seed();
  const { request } = await queueTimeChange(seeded);

  await reviewScheduleChangeRequest(
    adminReq(oid(), request._id, { status: "approved" }),
    mockRes()
  );

  const res = mockRes();
  await reviewScheduleChangeRequest(
    adminReq(oid(), request._id, { status: "rejected" }),
    res
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /already been reviewed/);
});

test("approving a removal drops the class and archives its roster", async () => {
  const seeded = await seed();
  const target = seeded.teacher.weeklyAvailability[0];
  await addRoster({ teacher: seeded.teacher, course: seeded.course, entry: target });

  await setWeeklyAvailability(
    teacherReq(seeded.user._id, [
      asPayload(seeded.teacher.weeklyAvailability[1], {
        _id: String(seeded.teacher.weeklyAvailability[1]._id),
      }),
    ]),
    mockRes()
  );

  const request = await ScheduleChangeRequest.findOne({ parentAvailabilityId: target._id });
  const res = mockRes();
  await reviewScheduleChangeRequest(
    adminReq(oid(), request._id, { status: "approved" }),
    res
  );

  assert.equal(res.statusCode, 200);
  const entry = (await Teacher.findById(seeded.teacher._id)).weeklyAvailability.id(target._id);
  assert.equal(entry, null, "class removed from the schedule");

  const roster = await ClassRoster.findOne({ parentAvailabilityId: target._id });
  assert.equal(roster.status, "archived");

  const futureLeft = await Slot.countDocuments({
    parentAvailabilityId: target._id,
    date: { $gte: new Date() },
  });
  assert.equal(futureLeft, 0);
});
