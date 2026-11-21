"use strict";

// Admins see an enrolled learner's class join links on the student profile,
// the same way they see demo links. Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

const mongoose = require("mongoose");
const ClassRoster = require("../model/classRoster.model");
const Course = require("../model/course.model");
const Slot = require("../model/slot.model");
const Student = require("../model/student.model");
const Teacher = require("../model/teacher.model");
const User = require("../model/user.model");
const { getStudentOverview } = require("../controller/student.controller");

const oid = () => new mongoose.Types.ObjectId();
let seq = 0;

const mockRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (body) => ((res.body = body), res);
  return res;
};

const makeUser = (firstName, accountType) => {
  seq += 1;
  return User.create({
    name: { firstName, lastName: "Test" },
    password: "x",
    mobileNo: 9200000000 + seq,
    email: `${firstName.toLowerCase()}${seq}@test.com`,
    accountType,
  });
};

async function scenario() {
  const teacherUser = await makeUser("Meera", "teacher");
  const teacher = await Teacher.create({ userId: teacherUser._id, teacherDetail: oid() });
  const studentUser = await makeUser("Asha", "student");
  const student = await Student.create({ userId: studentUser._id });
  seq += 1;
  const course = await Course.create({
    name: `Guitar ${seq}`,
    code: `G${seq}`,
    description: "d",
    category: oid(),
    subCategory: [oid()],
    mode: "online",
    teacher: [teacher._id],
  });

  const weekly = await ClassRoster.create({
    teacherId: teacher._id,
    courseId: course._id,
    parentAvailabilityId: oid(),
    sessionType: "standard",
    recurringDays: ["monday", "thursday"],
    startTime: "17:00",
    endTime: "18:00",
    students: [{ studentId: student._id }],
    meetingLink: "https://meet.google.com/weekly-room",
  });
  // A class the learner was moved out of: its link must not show.
  await ClassRoster.create({
    teacherId: teacher._id,
    courseId: course._id,
    parentAvailabilityId: oid(),
    sessionType: "standard",
    startTime: "09:00",
    endTime: "10:00",
    students: [{ studentId: student._id, status: "removed" }, { studentId: oid() }],
    meetingLink: "https://meet.google.com/old-room",
  });

  const day = (offset) => {
    const date = new Date(Date.now() + offset * 24 * 3600000);
    date.setHours(0, 0, 0, 0);
    return date;
  };
  const slotFields = {
    courseId: course._id,
    startTime: "17:00",
    endTime: "18:00",
    createdBy: teacher._id,
    slotType: "enrolled",
    sessionType: "standard",
    parentAvailabilityId: weekly.parentAvailabilityId,
    students: [student._id],
  };
  await Slot.create({ ...slotFields, date: day(2) });
  await Slot.create({
    ...slotFields,
    date: day(5),
    meetingLinkOverride: "https://meet.google.com/one-off-room",
  });

  return { student, weekly };
}

before(startMemoryMongo);
after(stopMemoryMongo);
beforeEach(clearCollections);

test("the overview lists the learner's classes with their join links", async () => {
  const { student, weekly } = await scenario();
  const res = mockRes();
  await getStudentOverview({ params: { id: String(student._id) } }, res);

  assert.equal(res.statusCode, 200);
  const { classes } = res.body.overview;
  assert.equal(classes.length, 1, "a class the learner left is not listed");
  assert.equal(String(classes[0].parentAvailabilityId), String(weekly.parentAvailabilityId));
  assert.equal(classes[0].meetingLink, "https://meet.google.com/weekly-room");
  assert.equal(classes[0].teacherName, "Meera Test");
  assert.equal(classes[0].course.name.startsWith("Guitar"), true);
});

test("each upcoming class carries the link the learner will actually use", async () => {
  const { student } = await scenario();
  const res = mockRes();
  await getStudentOverview({ params: { id: String(student._id) } }, res);

  const links = res.body.overview.upcomingClasses.map((cls) => cls.meetingLink);
  assert.deepEqual(links, [
    "https://meet.google.com/weekly-room",
    "https://meet.google.com/one-off-room",
  ]);
  assert.equal(
    res.body.overview.upcomingClasses.some((cls) => "meetingLinkOverride" in cls),
    false
  );
});
