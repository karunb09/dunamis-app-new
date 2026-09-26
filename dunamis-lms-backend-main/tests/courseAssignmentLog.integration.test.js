"use strict";

// An instructor vanished from a course after an Edit Course save sent a stale
// full instructor list. Edits now send only a diff (teacherAdd/teacherRemove),
// refuse to remove an instructor who still has students, and every link change
// leaves a CourseAssignmentLog row naming the admin.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.MAIL_HOST = "";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

const mongoose = require("mongoose");
const Course = require("../model/course.model");
const Teacher = require("../model/teacher.model");
const ClassRoster = require("../model/classRoster.model");
// Registered so the controllers' populates resolve; the app does this via index.js.
require("../model/teacherApplication.model");
require("../model/category.model");
require("../model/subCategory.model");
require("../model/content.model");
require("../model/branch.model");
require("../model/user.model");
const CourseRequest = require("../model/courseRequest.model");
const CourseAssignmentLog = require("../model/courseAssignmentLog.model");
const { updateCourse, deleteCourse } = require("../controller/course.controller");
const { updateCourseItemStatus } = require("../controller/courseRequest.controller");

const oid = () => new mongoose.Types.ObjectId();
const admin = { userId: oid(), email: "admin@example.com", accountType: "admin" };

const mockRes = () => {
  const res = { statusCode: 200 };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
};

const call = async (handler, req) => {
  const res = mockRes();
  await handler({ user: admin, body: {}, params: {}, ...req }, res, (err) => { if (err) throw err; });
  return res;
};

async function makeTeacher(firstName) {
  const detailId = oid();
  await mongoose.connection.collection("teacherapplications").insertOne({ _id: detailId, email: `${detailId}@example.com`, name: { firstName, lastName: "T" } });
  const _id = oid();
  await Teacher.collection.insertOne({ _id, userId: oid(), teacherDetail: detailId, course: [] });
  return _id;
}

async function makeCourse(teacherIds = []) {
  const course = await Course.collection.insertOne({
    name: "GUITAR",
    code: `G${Date.now()}${Math.random()}`,
    mode: "online",
    teacher: teacherIds,
    price: [],
  });
  await Teacher.updateMany({ _id: { $in: teacherIds } }, { $addToSet: { course: course.insertedId } });
  return course.insertedId;
}

before(startMemoryMongo);
after(stopMemoryMongo);
beforeEach(clearCollections);

test("course edit that drops an instructor logs who unassigned them", async () => {
  const kept = await makeTeacher("Kept");
  const dropped = await makeTeacher("Dropped");
  const courseId = await makeCourse([kept, dropped]);

  const res = await call(updateCourse, {
    params: { id: String(courseId) },
    body: { teacherRemove: JSON.stringify([String(dropped)]) },
  });
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
  const course = await Course.findById(courseId).lean();
  assert.deepEqual(course.teacher.map(String), [String(kept)]);

  const logs = await CourseAssignmentLog.find({ courseId }).lean();
  assert.equal(logs.length, 1);
  assert.equal(logs[0].action, "unassigned");
  assert.equal(logs[0].source, "course_edit");
  assert.equal(String(logs[0].teacherId), String(dropped));
  assert.equal(logs[0].teacherName, "Dropped T");
  assert.equal(logs[0].courseName, "GUITAR");
  assert.equal(logs[0].actorEmail, "admin@example.com");
});

test("course edit with no instructor changes logs nothing", async () => {
  const t = await makeTeacher("Same");
  const courseId = await makeCourse([t]);

  await call(updateCourse, {
    params: { id: String(courseId) },
    body: { teacherAdd: "[]", teacherRemove: "[]" },
  });

  assert.equal(await CourseAssignmentLog.countDocuments({ courseId }), 0);
});

test("instructor assigned after the edit form loaded survives the save", async () => {
  const original = await makeTeacher("Original");
  const courseId = await makeCourse([original]);
  // Approved via a course request while an admin had the edit form open.
  const lateArrival = await makeTeacher("Late");
  await Course.updateOne({ _id: courseId }, { $addToSet: { teacher: lateArrival } });
  await Teacher.updateOne({ _id: lateArrival }, { $addToSet: { course: courseId } });

  const added = await makeTeacher("Added");
  const res = await call(updateCourse, {
    params: { id: String(courseId) },
    body: { teacherAdd: JSON.stringify([String(added)]), teacherRemove: "[]" },
  });
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));

  const course = await Course.findById(courseId).lean();
  assert.deepEqual(course.teacher.map(String).sort(), [original, lateArrival, added].map(String).sort());
  const late = await Teacher.findById(lateArrival).lean();
  assert.ok(late.course.some((c) => String(c) === String(courseId)));
});

test("a full teacher list on edit is ignored, not applied", async () => {
  const a = await makeTeacher("A");
  const b = await makeTeacher("B");
  const courseId = await makeCourse([a, b]);

  await call(updateCourse, { params: { id: String(courseId) }, body: { teacher: JSON.stringify([String(a)]) } });

  const course = await Course.findById(courseId).lean();
  assert.equal(course.teacher.length, 2);
});

test("removing an instructor who still teaches students on the course is refused", async () => {
  const busy = await makeTeacher("Busy");
  const courseId = await makeCourse([busy]);
  await ClassRoster.collection.insertOne({
    teacherId: busy,
    courseId,
    parentAvailabilityId: oid(),
    status: "active",
    students: [{ studentId: oid(), status: "paused" }],
  });

  const res = await call(updateCourse, {
    params: { id: String(courseId) },
    body: { teacherRemove: JSON.stringify([String(busy)]) },
  });

  assert.equal(res.statusCode, 409);
  assert.ok(res.body.hint);
  const course = await Course.findById(courseId).lean();
  assert.deepEqual(course.teacher.map(String), [String(busy)]);
  assert.equal(await CourseAssignmentLog.countDocuments({ courseId }), 0);
});

test("approving a course request logs the assignment once", async () => {
  const t = await makeTeacher("Requester");
  const courseId = await makeCourse([]);
  const request = await CourseRequest.create({
    instructor: t,
    requestType: "single",
    courses: [{ category: oid() }],
  });

  const res = await call(updateCourseItemStatus, {
    params: { id: String(request._id), itemIndex: "0" },
    body: { status: "approved", courseId: String(courseId) },
  });
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));

  const logs = await CourseAssignmentLog.find({ courseId }).lean();
  assert.equal(logs.length, 1);
  assert.equal(logs[0].action, "assigned");
  assert.equal(logs[0].source, "course_request");
  assert.equal(logs[0].teacherName, "Requester T");
});

test("deleting a course keeps its name on the unassignment rows", async () => {
  const t = await makeTeacher("Orphan");
  const courseId = await makeCourse([t]);

  await call(deleteCourse, { params: { id: String(courseId) } });

  const logs = await CourseAssignmentLog.find({ courseId }).lean();
  assert.equal(logs.length, 1);
  assert.equal(logs[0].source, "course_delete");
  assert.equal(logs[0].courseName, "GUITAR");
});
