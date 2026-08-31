"use strict";

// Integration tests for the admin enrollment lifecycle: pause, resume,
// discontinue, and the due-date extension used to compensate missed classes.
//
// The load-bearing claims are that a paused enrollment stops accruing dues
// while keeping its seat, that resuming gives back exactly the days lost, and
// that discontinuing writes off what is outstanding rather than leaving the
// student in the dues queue forever.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.MAIL_HOST = "";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

const mongoose = require("mongoose");
const ClassRoster = require("../model/classRoster.model");
const Student = require("../model/student.model");
const User = require("../model/user.model");
const {
  pauseEnrollment,
  resumeEnrollment,
  discontinueEnrollment,
  extendDueDate,
} = require("../controller/studentLifecycle.controller");
const { getPayableInstallments } = require("../services/enrollmentService");

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

async function seed() {
  seq += 1;
  const user = await User.create({
    name: { firstName: "Asha", lastName: "Test" },
    password: "x",
    mobileNo: 9000000000 + seq,
    email: `asha${seq}@test.com`,
    accountType: "student",
  });

  const courseId = oid();
  const teacherId = oid();
  const parentAvailabilityId = oid();

  const student = await Student.create({
    userId: user._id,
    enrolledCourses: [
      { courseId, slotId: oid(), status: "in-progress", active: true, joinedAt: daysAgo(90) },
    ],
    payments: [
      {
        courseId,
        teacherId,
        amount: 2000,
        installmentAmount: 2000,
        PaymentStatus: "completed",
        paymentType: "Installment",
        installmentNo: 2,
        installmentTotal: 6,
        courseType: "running",
        sessionType: "standard",
        monthlyPaymentStatus: "pending",
        dueDate: daysAgo(3),
        paidAt: daysAgo(33),
        feeStatus: "Paid",
      },
    ],
  });

  await ClassRoster.create({
    teacherId,
    courseId,
    parentAvailabilityId,
    sessionType: "standard",
    startTime: "17:00",
    endTime: "18:00",
    students: [{ studentId: student._id, status: "active" }],
  });

  const admin = await User.create({
    name: { firstName: "Nina", lastName: "Admin" },
    password: "x",
    mobileNo: 9100000000 + seq,
    email: `nina${seq}@test.com`,
    accountType: "admin",
  });

  return { student, courseId, teacherId, admin };
}

before(async () => {
  await startMemoryMongo();
});
after(async () => {
  await stopMemoryMongo();
});
beforeEach(async () => {
  await clearCollections();
});

test("pausing freezes billing and holds the seat", async () => {
  const { student, courseId, admin } = await seed();

  const before = await Student.findById(student._id);
  assert.equal(getPayableInstallments(before).length, 1, "owes a payment before the pause");

  const res = mockRes();
  await pauseEnrollment(
    adminReq(admin._id, { id: String(student._id), courseId: String(courseId) }, {
      reason: "Exams",
    }),
    res
  );
  assert.equal(res.statusCode, 200);

  const after = await Student.findById(student._id);
  assert.equal(after.enrolledCourses[0].status, "paused");
  assert.equal(after.enrolledCourses[0].pauseReason, "Exams");
  assert.equal(getPayableInstallments(after).length, 0, "a paused enrollment stops accruing");

  const roster = await ClassRoster.findOne({ courseId });
  assert.equal(roster.students[0].status, "paused", "the seat is held, not released");
  assert.equal(roster.students.length, 1);
});

test("resuming gives back exactly the days paused", async () => {
  const { student, courseId, admin } = await seed();

  // Paused 10 days ago, so resuming now owes the student 10 days.
  await Student.updateOne(
    { _id: student._id },
    {
      $set: {
        "enrolledCourses.0.status": "paused",
        "enrolledCourses.0.pausedAt": daysAgo(10),
      },
    }
  );
  await ClassRoster.updateOne({ courseId }, { $set: { "students.0.status": "paused" } });

  const before = await Student.findById(student._id);
  const originalDue = new Date(before.payments[0].dueDate);

  const res = mockRes();
  await resumeEnrollment(
    adminReq(admin._id, { id: String(student._id), courseId: String(courseId) }),
    res
  );
  assert.equal(res.statusCode, 200);

  const after = await Student.findById(student._id);
  assert.equal(after.enrolledCourses[0].status, "in-progress");

  const shifted = Math.round((after.payments[0].dueDate - originalDue) / DAY_MS);
  assert.equal(shifted, 10, "the next due date moved out by the paused days");
  assert.equal(after.payments[0].dueDateAdjustments.length, 1, "the shift is auditable");
  assert.equal(after.payments[0].dueDateAdjustments[0].days, 10);

  const roster = await ClassRoster.findOne({ courseId });
  assert.equal(roster.students[0].status, "active", "back on the register");
});

test("discontinuing writes off what is outstanding and releases the seat", async () => {
  const { student, courseId, admin } = await seed();

  const res = mockRes();
  await discontinueEnrollment(
    adminReq(admin._id, { id: String(student._id), courseId: String(courseId) }, {
      reason: "Moved city",
    }),
    res
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.writtenOffAmount, 2000);

  const after = await Student.findById(student._id);
  assert.equal(after.enrolledCourses[0].status, "discontinued");
  assert.equal(after.enrolledCourses[0].discontinuedReason, "Moved city");
  assert.ok(after.payments[0].writtenOffAt);
  assert.equal(
    after.payments[0].monthlyPaymentStatus,
    "completed",
    "leaves the dues queue without being recorded as paid"
  );
  assert.equal(after.payments[0].feeStatus, "Paid", "the paid installment is untouched");
  assert.equal(getPayableInstallments(after).length, 0);

  const roster = await ClassRoster.findOne({ courseId });
  assert.equal(roster.students[0].status, "removed", "the seat is freed");
});

test("a due date can be pushed out to compensate missed classes", async () => {
  const { student, admin } = await seed();
  const before = await Student.findById(student._id);
  const paymentId = before.payments[0]._id;
  const originalDue = new Date(before.payments[0].dueDate);

  const res = mockRes();
  await extendDueDate(
    adminReq(admin._id, { id: String(student._id), paymentId: String(paymentId) }, {
      days: 14,
      reason: "Instructor was unwell for two weeks",
    }),
    res
  );

  assert.equal(res.statusCode, 200);
  const after = await Student.findById(student._id);
  const shifted = Math.round((after.payments[0].dueDate - originalDue) / DAY_MS);
  assert.equal(shifted, 14);
  assert.equal(after.payments[0].dueDateAdjustments[0].reason, "Instructor was unwell for two weeks");
  assert.equal(
    after.payments[0].reminderSentAt,
    null,
    "the reminder cron treats the new date as a fresh cycle"
  );
});

test("a due date cannot be pulled earlier", async () => {
  const { student, admin } = await seed();
  const before = await Student.findById(student._id);

  const res = mockRes();
  await extendDueDate(
    adminReq(
      admin._id,
      { id: String(student._id), paymentId: String(before.payments[0]._id) },
      { newDueDate: daysAgo(30) }
    ),
    res
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /later than the current one/);
});

// A fixed course's final installment is stored with dueDate null. The schema
// used to require a dueDate on every installment, and because payments are
// pushed with updateOne (no validators) those rows existed happily until
// something called student.save() — which then failed on a row it was not even
// touching. This is that shape.
test("a settled installment ladder does not block lifecycle actions", async () => {
  const { student, courseId, teacherId, admin } = await seed();

  const otherCourseId = oid();
  await Student.updateOne(
    { _id: student._id },
    {
      $push: {
        payments: {
          $each: [
            {
              courseId: otherCourseId,
              teacherId,
              amount: 1500,
              PaymentStatus: "completed",
              paymentType: "Installment",
              installmentNo: 5,
              installmentTotal: 6,
              monthlyPaymentStatus: "pending",
              dueDate: daysAgo(30),
              paidAt: daysAgo(60),
            },
            {
              courseId: otherCourseId,
              teacherId,
              amount: 1500,
              PaymentStatus: "completed",
              paymentType: "Installment",
              installmentNo: 6,
              installmentTotal: 6,
              // The terminal installment: nothing left to bill, so no due date.
              monthlyPaymentStatus: "completed",
              dueDate: null,
              paidAt: daysAgo(30),
            },
          ],
        },
      },
    }
  );

  const res = mockRes();
  await discontinueEnrollment(
    adminReq(admin._id, { id: String(student._id), courseId: String(courseId) }, {
      reason: "Moved city",
    }),
    res
  );

  assert.equal(res.statusCode, 200, res.body?.message);
  const after = await Student.findById(student._id);
  assert.equal(after.enrolledCourses[0].status, "discontinued");
});

test("pausing an already-paused enrollment is refused", async () => {
  const { student, courseId, admin } = await seed();
  const params = { id: String(student._id), courseId: String(courseId) };

  await pauseEnrollment(adminReq(admin._id, params, {}), mockRes());

  const res = mockRes();
  await pauseEnrollment(adminReq(admin._id, params, {}), res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /already paused/);
});
