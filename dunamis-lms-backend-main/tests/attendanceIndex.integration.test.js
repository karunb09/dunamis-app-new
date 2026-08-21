"use strict";

// Integration tests for the attendanceHomework unique key.
//
// The old key was { studentId, courseId, date }, which could not tell two
// same-day classes apart. A student in two batches of one course on one day
// collided with E11000 and their attendance was silently dropped — the seed
// script had a bare catch admitting exactly that. These tests pin the new key,
// { slotId, studentId }, and the upsert filter that has to match it.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.MAIL_HOST = "";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

const mongoose = require("mongoose");
const AttendanceHomework = require("../model/attendanceHomework.model");
const Course = require("../model/course.model");
const Slot = require("../model/slot.model");
const Student = require("../model/student.model");
const Teacher = require("../model/teacher.model");
const User = require("../model/user.model");
const { updateAttendanceHomework } = require("../controller/attendanceHomework.controller");

const oid = () => new mongoose.Types.ObjectId();

// The Saturday both Wed-Sat and Sat-Sun batches meet on.
const SATURDAY = new Date("2026-08-22T00:00:00.000Z");

let seq = 0;

const mockRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (body) => ((res.body = body), res);
  return res;
};

async function makeUser(firstName, accountType) {
  return User.create({
    name: { firstName, lastName: "Test" },
    password: "x",
    mobileNo: 9000000000 + seq++,
    email: `${firstName.toLowerCase()}${seq}@test.com`,
    accountType,
  });
}

async function makeTeacher() {
  const user = await makeUser("Meera", "teacher");
  const teacher = await Teacher.create({ userId: user._id, teacherDetail: oid() });
  return { user, teacher };
}

async function makeStudent() {
  const user = await makeUser("Asha", "student");
  const student = await Student.create({ userId: user._id });
  return { user, student };
}

async function makeCourse() {
  return Course.create({
    name: `Course ${seq++}`,
    code: `C${seq}`,
    description: "d",
    category: oid(),
    // Single-element array: resolveAttendanceEntries assigns the whole array
    // to the ObjectId field, which only casts for one element.
    subCategory: [oid()],
  });
}

async function makeSlot({ teacherId, courseId, sessionType = "standard", students = [] }) {
  return Slot.create({
    courseId,
    date: SATURDAY,
    startTime: "16:00",
    endTime: "17:00",
    createdBy: teacherId,
    slotType: "enrolled",
    sessionType,
    students,
  });
}

const entry = ({ teacherId, studentId, userId, courseId, subCategory, slotId, sessionType = "standard" }) => ({
  teacherId,
  studentId,
  userId,
  courseId,
  category: oid(),
  subCategory,
  slotId,
  sessionType,
  attendanceStatus: "Present",
  homework: "Practice scales.",
  date: SATURDAY,
});

before(async () => {
  await startMemoryMongo();
  // Without this the in-memory collection has no indexes and every assertion
  // below passes vacuously.
  await AttendanceHomework.init();
});
after(async () => {
  await stopMemoryMongo();
});
beforeEach(async () => {
  await clearCollections();
});

test("one student, one course, one day, two batches — both rows survive", async () => {
  const { teacher } = await makeTeacher();
  const { student, user } = await makeStudent();
  const course = await makeCourse();

  // Wed-Sat batch and Sat-Sun batch of the same course, both meeting Saturday.
  const wedSat = await makeSlot({ teacherId: teacher._id, courseId: course._id });
  const satSun = await makeSlot({ teacherId: teacher._id, courseId: course._id });

  const base = {
    teacherId: teacher._id,
    studentId: student._id,
    userId: user._id,
    courseId: course._id,
    subCategory: course.subCategory,
  };

  await AttendanceHomework.create(entry({ ...base, slotId: wedSat._id }));
  await AttendanceHomework.create(entry({ ...base, slotId: satSun._id }));

  const count = await AttendanceHomework.countDocuments({ studentId: student._id });
  assert.equal(count, 2, "the old { studentId, courseId, date } key dropped the second row");
});

test("premium and standard sections of one course on one day both record", async () => {
  const { teacher } = await makeTeacher();
  const { student, user } = await makeStudent();
  const course = await makeCourse();

  const group = await makeSlot({ teacherId: teacher._id, courseId: course._id, sessionType: "standard" });
  const oneToOne = await makeSlot({ teacherId: teacher._id, courseId: course._id, sessionType: "premium" });

  const base = {
    teacherId: teacher._id,
    studentId: student._id,
    userId: user._id,
    courseId: course._id,
    subCategory: course.subCategory,
  };

  await AttendanceHomework.create(entry({ ...base, slotId: group._id }));
  await AttendanceHomework.create(entry({ ...base, slotId: oneToOne._id, sessionType: "premium" }));

  assert.equal(await AttendanceHomework.countDocuments({ studentId: student._id }), 2);
});

test("the same student cannot be marked twice for the same class", async () => {
  const { teacher } = await makeTeacher();
  const { student, user } = await makeStudent();
  const course = await makeCourse();
  const slot = await makeSlot({ teacherId: teacher._id, courseId: course._id });

  const base = {
    teacherId: teacher._id,
    studentId: student._id,
    userId: user._id,
    courseId: course._id,
    subCategory: course.subCategory,
    slotId: slot._id,
  };

  await AttendanceHomework.create(entry(base));
  await assert.rejects(
    () => AttendanceHomework.create(entry(base)),
    (err) => err.code === 11000,
    "loosening the key must not lose the invariant"
  );
});

test("editing a class that was never submitted inserts instead of throwing", async () => {
  const { teacher, user: teacherUser } = await makeTeacher();
  const { student } = await makeStudent();
  const course = await makeCourse();
  const slot = await makeSlot({
    teacherId: teacher._id,
    courseId: course._id,
    students: [student._id],
  });

  const res = mockRes();
  await updateAttendanceHomework(
    {
      params: { slotId: slot._id.toString() },
      user: { userId: teacherUser._id.toString() },
      body: {
        sessionType: "standard",
        students: [{ studentId: student._id.toString(), attendanceStatus: "Absent", homework: "" }],
      },
    },
    res
  );

  assert.equal(res.statusCode, 200);
  const rows = await AttendanceHomework.find({ slotId: slot._id }).lean();
  assert.equal(rows.length, 1, "upsert must reach its insert branch");
  assert.equal(rows[0].attendanceStatus, "Absent");
});

test("editing a submitted class updates in place without adding a row", async () => {
  const { teacher, user: teacherUser } = await makeTeacher();
  const { student, user } = await makeStudent();
  const course = await makeCourse();
  const slot = await makeSlot({
    teacherId: teacher._id,
    courseId: course._id,
    students: [student._id],
  });

  await AttendanceHomework.create(
    entry({
      teacherId: teacher._id,
      studentId: student._id,
      userId: user._id,
      courseId: course._id,
      subCategory: course.subCategory,
      slotId: slot._id,
    })
  );

  const res = mockRes();
  await updateAttendanceHomework(
    {
      params: { slotId: slot._id.toString() },
      user: { userId: teacherUser._id.toString() },
      body: {
        sessionType: "standard",
        students: [
          { studentId: student._id.toString(), attendanceStatus: "Absent", homework: "Revised note." },
        ],
      },
    },
    res
  );

  assert.equal(res.statusCode, 200);
  const rows = await AttendanceHomework.find({ slotId: slot._id }).lean();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].attendanceStatus, "Absent");
  assert.equal(rows[0].homework, "Revised note.");
});
