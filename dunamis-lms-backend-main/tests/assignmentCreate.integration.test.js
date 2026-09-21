"use strict";

// Integration tests for instructor-created assignments and reviews.
//
// The load-bearing claims: an instructor can only assign to learners they
// actually teach; a learner whose monthly cycle already opened a placeholder
// gets that filled rather than a duplicate; and a review marks the learner
// being reviewed — not whoever happens to be first on a shared assignment.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.MAIL_HOST = "";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

const mongoose = require("mongoose");
const Assignment = require("../model/assignment.model");
const ClassRoster = require("../model/classRoster.model");
const Course = require("../model/course.model");
const Student = require("../model/student.model");
const Teacher = require("../model/teacher.model");
// reviewSubmission populates teacherId.teacherDetail; the app registers it via index.js.
require("../model/teacherApplication.model");
const User = require("../model/user.model");
const controller = require("../controller/assignment.controller");

const oid = () => new mongoose.Types.ObjectId();
let seq = 0;

const makeRes = () => {
  const res = { statusCode: 200, payload: null };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (payload) => ((res.payload = payload), res);
  return res;
};

const run = async (handler, req) => {
  const res = makeRes();
  await handler(req, res, (err) => {
    if (err) throw err;
  });
  return res;
};

const asTeacher = (teacher, body = {}) => ({
  user: { accountType: "teacher", userId: teacher.userId, roleId: teacher._id },
  params: {},
  body,
});

const person = async (firstName, accountType) => {
  seq += 1;
  return User.create({
    name: { firstName, lastName: "Test" },
    password: "x",
    mobileNo: 9900000000 + seq,
    email: `${firstName.toLowerCase()}${seq}@example.com`,
    accountType,
  });
};

let teacher;
let otherTeacher;
let course;
let asha;
let bala;
let outsider;

before(async () => {
  await startMemoryMongo();
});

after(async () => {
  await stopMemoryMongo();
});

beforeEach(async () => {
  await clearCollections();

  teacher = await Teacher.create({ userId: (await person("Gaurav", "teacher"))._id, teacherDetail: oid() });
  otherTeacher = await Teacher.create({ userId: (await person("Ravi", "teacher"))._id, teacherDetail: oid() });
  asha = await Student.create({ userId: (await person("Asha", "student"))._id });
  bala = await Student.create({ userId: (await person("Bala", "student"))._id });
  outsider = await Student.create({ userId: (await person("Chitra", "student"))._id });

  course = await Course.create({ name: "Drawing Essentials", code: `DRW-${seq}`, level: "beginner" });

  await ClassRoster.create({
    teacherId: teacher._id,
    courseId: course._id,
    parentAvailabilityId: oid(),
    sessionType: "standard",
    startTime: "16:00",
    endTime: "17:00",
    students: [
      { studentId: asha._id, status: "active" },
      { studentId: bala._id, status: "active" },
    ],
  });
});

const body = (studentIds, extra = {}) => ({
  courseId: course._id,
  studentIds,
  title: "Shade a sphere",
  description: "Three values of light and shadow.",
  dueDate: new Date(Date.now() + 7 * 86400000),
  ...extra,
});

test("the learner picker lists exactly the instructor's roster", async () => {
  const res = await run(controller.listTeacherLearners, asTeacher(teacher));

  assert.equal(res.payload.count, 2);
  assert.deepEqual(
    res.payload.learners.map((l) => l.studentName).sort(),
    ["Asha Test", "Bala Test"]
  );
  assert.equal(res.payload.learners[0].courseName, "Drawing Essentials");
});

test("creating for two learners gives each their own assignment", async () => {
  const res = await run(controller.createAssignment, asTeacher(teacher, body([asha._id, bala._id])));

  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.created, 2);

  const docs = await Assignment.find({ teacherId: teacher._id });
  assert.equal(docs.length, 2);
  docs.forEach((doc) => {
    assert.equal(doc.title, "Shade a sphere");
    assert.equal(doc.students.length, 1);
    assert.equal(doc.students[0].status, "assigned");
  });
});

test("a learner not in the instructor's class is refused, and nothing is created", async () => {
  const res = await run(controller.createAssignment, asTeacher(teacher, body([asha._id, outsider._id])));

  assert.equal(res.statusCode, 403);
  assert.equal(await Assignment.countDocuments(), 0);
});

test("another instructor cannot assign to these learners", async () => {
  const res = await run(controller.createAssignment, asTeacher(otherTeacher, body([asha._id])));

  assert.equal(res.statusCode, 403);
});

test("an open monthly placeholder is filled instead of duplicated", async () => {
  const stub = await Assignment.create({
    courseId: course._id,
    teacherId: teacher._id,
    userId: teacher.userId,
    title: "",
    dueDate: null,
    students: [{ studentId: asha._id, status: "reminder" }],
  });

  const res = await run(controller.createAssignment, asTeacher(teacher, body([asha._id, bala._id])));

  assert.equal(res.payload.filledMonthlySlot, 1);
  assert.equal(res.payload.created, 1);
  assert.equal(await Assignment.countDocuments(), 2, "Asha's placeholder was reused");

  const filled = await Assignment.findById(stub._id);
  assert.equal(filled.title, "Shade a sphere");
  assert.equal(filled.students[0].status, "assigned");
});

test("a review marks the learner being reviewed, not whoever is first", async () => {
  const shared = await Assignment.create({
    courseId: course._id,
    teacherId: teacher._id,
    userId: teacher.userId,
    title: "Shared",
    dueDate: new Date(),
    students: [
      { studentId: asha._id, status: "pending" },
      { studentId: bala._id, status: "pending" },
    ],
  });

  const res = await run(
    controller.reviewSubmission,
    asTeacher(teacher, { assignmentId: shared._id, studentId: bala._id, feedback: "Nice work", rating: 4 })
  );

  assert.equal(res.statusCode, 200);
  const stored = await Assignment.findById(shared._id);
  assert.equal(stored.students.find((s) => String(s.studentId) === String(bala._id)).status, "reviewed");
  assert.equal(stored.students.find((s) => String(s.studentId) === String(asha._id)).status, "pending");
});

test("an instructor cannot review another instructor's assignment", async () => {
  const theirs = await Assignment.create({
    courseId: course._id,
    teacherId: teacher._id,
    userId: teacher.userId,
    title: "Mine",
    dueDate: new Date(),
    students: [{ studentId: asha._id, status: "pending" }],
  });

  const res = await run(
    controller.reviewSubmission,
    asTeacher(otherTeacher, { assignmentId: theirs._id, studentId: asha._id, feedback: "x", rating: 3 })
  );

  assert.equal(res.statusCode, 403);
  const stored = await Assignment.findById(theirs._id);
  assert.equal(stored.students[0].status, "pending");
});
