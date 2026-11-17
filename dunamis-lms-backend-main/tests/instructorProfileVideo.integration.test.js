"use strict";

// An instructor replaced their profile video from My Courses and the website
// kept playing the one from their application: the upload adds a version to
// Teacher.profileVideos, while the public endpoints read only the application.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.MAIL_HOST = "";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

const mongoose = require("mongoose");
const Course = require("../model/course.model");
const Teacher = require("../model/teacher.model");
// Registered so the controllers' populates resolve; the app does this via index.js.
require("../model/teacherApplication.model");
require("../model/category.model");
require("../model/subCategory.model");
require("../model/content.model");
require("../model/branch.model");
require("../model/user.model");
const { getAllCourses, getCourseById } = require("../controller/course.controller");
const { getPublicTeachers, getPublicTeacherById } = require("../controller/teacher.controller");

const oid = () => new mongoose.Types.ObjectId();

const ORIGINAL = "/uploads/application.mp4";
const REPLACED = "/uploads/replaced.mp4";
const LATEST = "/uploads/latest.mp4";

const call = async (handler, req = {}) => {
  const res = { statusCode: 200 };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  await handler({ body: {}, params: {}, query: {}, ...req }, res, (err) => { if (err) throw err; });
  return res;
};

async function makeTeacher(profileVideos) {
  const detailId = oid();
  await mongoose.connection.collection("teacherapplications").insertOne({
    _id: detailId,
    email: `${detailId}@example.com`,
    name: { firstName: "Violin", lastName: "Teacher" },
    profileVideo: ORIGINAL,
  });
  const _id = oid();
  await Teacher.collection.insertOne({
    _id,
    teacherDetail: detailId,
    course: [],
    ...(profileVideos ? { profileVideos } : {}),
  });
  return _id;
}

async function makeCourse(teacherId) {
  const course = await Course.collection.insertOne({
    name: "VIOLIN",
    code: `V${Date.now()}${Math.random()}`,
    mode: "online",
    teacher: [teacherId],
    price: [],
  });
  return course.insertedId;
}

const versions = () => [
  { filePath: ORIGINAL, uploadedAt: new Date("2026-06-25"), isActive: false },
  { filePath: REPLACED, uploadedAt: new Date("2026-08-17"), isActive: false },
  { filePath: LATEST, uploadedAt: new Date("2026-08-18"), isActive: true },
];

before(startMemoryMongo);
after(stopMemoryMongo);
beforeEach(clearCollections);

test("public course endpoints serve the instructor's latest profile video", async () => {
  const teacherId = await makeTeacher(versions());
  const courseId = await makeCourse(teacherId);

  const one = await call(getCourseById, { params: { id: String(courseId) } });
  assert.equal(one.statusCode, 200, JSON.stringify(one.body));
  assert.equal(one.body.data.teacher[0].teacherDetail.profileVideo, LATEST);
  assert.equal(one.body.data.teacher[0].profileVideos, undefined, "version history stays private");

  const all = await call(getAllCourses);
  assert.equal(all.body.data[0].teacher[0].teacherDetail.profileVideo, LATEST);
});

test("an instructor with no uploaded versions keeps the application video", async () => {
  const teacherId = await makeTeacher();
  const courseId = await makeCourse(teacherId);

  const one = await call(getCourseById, { params: { id: String(courseId) } });
  assert.equal(one.body.data.teacher[0].teacherDetail.profileVideo, ORIGINAL);

  const profile = await call(getPublicTeacherById, { params: { id: String(teacherId) } });
  assert.equal(profile.body.data.introVideoUrl, ORIGINAL);
});

test("public instructor endpoints serve the latest profile video", async () => {
  const teacherId = await makeTeacher(versions());

  const profile = await call(getPublicTeacherById, { params: { id: String(teacherId) } });
  assert.equal(profile.statusCode, 200, JSON.stringify(profile.body));
  assert.equal(profile.body.data.introVideoUrl, LATEST);
  assert.equal(profile.body.data.teacherDetails.profileVideo, LATEST);

  const list = await call(getPublicTeachers);
  assert.equal(list.body.data[0].teacherApplication.profileVideo, LATEST);
});
