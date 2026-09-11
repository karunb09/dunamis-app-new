"use strict";

// Integration tests for the learning clocks and paused enrollments.
//
// The load-bearing claim: paused time is not teaching time. A learner frozen
// for a month must not lose a month of their six-month assessment cycle, must
// not be marked Overdue while frozen, and must not have the monthly assignment
// rhythm fire on the day they come back.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.MAIL_HOST = "";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

const mongoose = require("mongoose");
const Assessment = require("../model/assessment.model");
const Category = require("../model/category.model");
const Course = require("../model/course.model");
const Student = require("../model/student.model");
const Teacher = require("../model/teacher.model");
const User = require("../model/user.model");
const {
  pauseEnrollment,
  resumeEnrollment,
} = require("../controller/studentLifecycle.controller");

const oid = () => new mongoose.Types.ObjectId();
const DAY_MS = 86400000;
let seq = 0;

const mockRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (body) => ((res.body = body), res);
  return res;
};

const adminReq = (adminId, params, body = {}) => ({
  user: { accountType: "admin", userId: adminId, roleId: adminId },
  params,
  body,
});

const daysAgo = (n) => new Date(Date.now() - n * DAY_MS);
const daysAhead = (n) => new Date(Date.now() + n * DAY_MS);
const dayDiff = (a, b) => Math.round((new Date(a) - new Date(b)) / DAY_MS);
// The cycle stores due dates normalized to local midnight.
const atMidnight = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

async function seed({ joinedDaysAgo = 90 } = {}) {
  seq += 1;

  const user = await User.create({
    name: { firstName: "Asha", lastName: "Test" },
    password: "x",
    mobileNo: 9200000000 + seq,
    email: `pause${seq}@test.com`,
    accountType: "student",
  });

  const teacherUser = await User.create({
    name: { firstName: "Nidhi", lastName: "Rao" },
    password: "x",
    mobileNo: 9300000000 + seq,
    email: `tutor${seq}@test.com`,
    accountType: "teacher",
  });
  const teacher = await Teacher.create({
    userId: teacherUser._id,
    teacherDetail: oid(),
  });

  const category = await Category.create({ name: `Music ${seq}` });
  const course = await Course.create({
    name: "Carnatic Vocals",
    code: `VOC-${seq}`,
    category: category._id,
    level: "beginner",
    teacher: [teacher._id],
  });

  const student = await Student.create({
    userId: user._id,
    enrolledCourses: [
      {
        courseId: course._id,
        slotId: oid(),
        status: "in-progress",
        active: true,
        joinedAt: daysAgo(joinedDaysAgo),
      },
    ],
  });

  const admin = await User.create({
    name: { firstName: "Nina", lastName: "Admin" },
    password: "x",
    mobileNo: 9400000000 + seq,
    email: `admin${seq}@test.com`,
    accountType: "admin",
  });

  return { student, course, teacher, admin };
}

// Pausing stamps pausedAt with the real clock, so the only way to simulate a
// pause of a given length is to backdate it after the fact.
const pauseFor = async ({ student, course, admin, days }) => {
  await pauseEnrollment(
    adminReq(admin._id, { id: student._id, courseId: course._id }, { reason: "Travelling" }),
    mockRes()
  );

  await Student.updateOne(
    { _id: student._id, "enrolledCourses.courseId": course._id },
    { $set: { "enrolledCourses.$.pausedAt": daysAgo(days) } }
  );
};

const resume = async ({ student, course, admin }) => {
  const res = mockRes();
  await resumeEnrollment(
    adminReq(admin._id, { id: student._id, courseId: course._id }),
    res
  );
  return res;
};

const enrollmentOf = async (studentId, courseId) => {
  const fresh = await Student.findById(studentId).lean();
  return fresh.enrolledCourses.find(
    (e) => String(e.courseId) === String(courseId)
  );
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

test("resuming pushes the open assessment out by the paused days", async () => {
  const { student, course, teacher, admin } = await seed();
  const originalDue = daysAhead(30);

  await Assessment.create({
    studentId: student._id,
    courseId: course._id,
    teacherId: teacher._id,
    dueDate: originalDue,
    status: "Pending",
  });

  await pauseFor({ student, course, admin, days: 40 });
  const res = await resume({ student, course, admin });
  assert.equal(res.statusCode, 200);

  const assessment = await Assessment.findOne({ studentId: student._id });
  assert.equal(dayDiff(assessment.dueDate, originalDue), 40);
  assert.equal(assessment.dueDateAdjustments.length, 1);
  assert.equal(assessment.dueDateAdjustments[0].days, 40);
  assert.match(assessment.dueDateAdjustments[0].reason, /40 paused days/);
});

test("an assessment that fell due during the pause is not left Overdue", async () => {
  const { student, course, teacher, admin } = await seed();

  await Assessment.create({
    studentId: student._id,
    courseId: course._id,
    teacherId: teacher._id,
    dueDate: daysAgo(10),
    // The nightly sweep flagged it while the learner was frozen.
    status: "Overdue",
  });

  await pauseFor({ student, course, admin, days: 30 });
  await resume({ student, course, admin });

  const assessment = await Assessment.findOne({ studentId: student._id });
  assert.equal(assessment.status, "Pending", "it was never late — the learner was frozen");
  assert.ok(assessment.dueDate > new Date(), "and it is due in the future again");
});

test("paused days accumulate across repeated pauses", async () => {
  const { student, course, admin } = await seed();

  await pauseFor({ student, course, admin, days: 12 });
  await resume({ student, course, admin });
  await pauseFor({ student, course, admin, days: 9 });
  await resume({ student, course, admin });

  const enrollment = await enrollmentOf(student._id, course._id);
  assert.equal(enrollment.pausedDaysTotal, 21);
  assert.equal(enrollment.status, "in-progress");
});

test("paused days hold the first assessment back", async () => {
  // Six months after joining has passed on the calendar (200 days), but 25 of
  // those were frozen — so the learner is not six months into teaching yet.
  const { student, course, admin } = await seed({ joinedDaysAgo: 200 });

  await pauseFor({ student, course, admin, days: 25 });
  await resume({ student, course, admin });

  const { runAssessmentCycle } = require("../services/assessmentCycle");
  await runAssessmentCycle();

  assert.equal(
    await Assessment.countDocuments({ studentId: student._id }),
    0,
    "nothing is scheduled until six months of teaching have actually happened"
  );
});

test("the first assessment lands six months out plus the paused days", async () => {
  const { student, course, teacher, admin } = await seed({ joinedDaysAgo: 240 });

  await pauseFor({ student, course, admin, days: 25 });
  await resume({ student, course, admin });

  const { runAssessmentCycle } = require("../services/assessmentCycle");
  await runAssessmentCycle();

  const assessment = await Assessment.findOne({ studentId: student._id });
  assert.ok(assessment, "an assessment is scheduled");

  const enrollment = await enrollmentOf(student._id, course._id);
  const sixMonths = new Date(enrollment.joinedAt);
  sixMonths.setMonth(sixMonths.getMonth() + 6);
  const expected = atMidnight(new Date(sixMonths.getTime() + 25 * DAY_MS));

  assert.equal(
    new Date(assessment.dueDate).getTime(),
    expected.getTime(),
    "six months of teaching, not six months of calendar"
  );
  assert.equal(assessment.teacherId.toString(), teacher._id.toString());
});

test("with no pause the first assessment is a plain six months after joining", async () => {
  const { student, course } = await seed({ joinedDaysAgo: 200 });

  const { runAssessmentCycle } = require("../services/assessmentCycle");
  await runAssessmentCycle();

  const assessment = await Assessment.findOne({ studentId: student._id });
  assert.ok(assessment, "six calendar months of teaching have passed");

  const enrollment = await enrollmentOf(student._id, course._id);
  const sixMonths = new Date(enrollment.joinedAt);
  sixMonths.setMonth(sixMonths.getMonth() + 6);

  assert.equal(
    new Date(assessment.dueDate).getTime(),
    atMidnight(sixMonths).getTime()
  );
});

test("the nightly sweep leaves a currently-paused learner alone", async () => {
  const { student, course, teacher, admin } = await seed();
  const other = await seed();

  for (const ctx of [{ student, course, teacher }, { student: other.student, course: other.course, teacher: other.teacher }]) {
    await Assessment.create({
      studentId: ctx.student._id,
      courseId: ctx.course._id,
      teacherId: ctx.teacher._id,
      dueDate: daysAgo(5),
      status: "Pending",
    });
  }

  await pauseEnrollment(
    adminReq(admin._id, { id: student._id, courseId: course._id }, { reason: "Exams" }),
    mockRes()
  );

  const { runAssessmentCycle } = require("../services/assessmentCycle");
  await runAssessmentCycle();

  const paused = await Assessment.findOne({ studentId: student._id });
  const active = await Assessment.findOne({ studentId: other.student._id });

  assert.equal(paused.status, "Pending", "frozen learners are not chased");
  assert.equal(active.status, "Overdue", "everyone else still is");
});

test("the assignment cycle resumes its rhythm rather than firing on the day of resume", async () => {
  // Joined 2 months ago, paused for the whole of the second — so only one
  // month of teaching has actually happened.
  const { student, course, admin } = await seed({ joinedDaysAgo: 62 });
  const Assignment = require("../model/assignment.model");

  await pauseFor({ student, course, admin, days: 31 });
  await resume({ student, course, admin });

  const { runAssignmentCycle } = require("../services/assignmentCycle");
  await runAssignmentCycle();

  const count = await Assignment.countDocuments({ "students.studentId": student._id });
  assert.equal(count, 1, "one month of teaching earns one assignment, not two");
});
