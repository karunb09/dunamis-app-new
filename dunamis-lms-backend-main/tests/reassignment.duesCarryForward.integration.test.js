"use strict";

// Reassigning a student to a new course previously left their outstanding
// installment pointed at the old course/slot/teacher — the Fees tab would
// then show it as "settled" (nothing due) since duesByCourse never matched
// the new course. carryForwardPendingDues re-points that one pending row.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.MAIL_HOST = "";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

const mongoose = require("mongoose");
const Student = require("../model/student.model");
const User = require("../model/user.model");
const { carryForwardPendingDues, getPayableInstallments } = require("../services/enrollmentService");

const oid = () => new mongoose.Types.ObjectId();
const daysAhead = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

let seq = 0;

async function makeStudent(payments) {
  const user = await User.create({
    name: { firstName: "Test", lastName: `Student${seq}` },
    password: "x",
    mobileNo: 9100000000 + seq++,
    email: `carryforward${seq}@test.com`,
    accountType: "student",
  });
  return Student.create({ userId: user._id, payments });
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

test("carryForwardPendingDues moves the pending installment onto the new course/slot/teacher, terms unchanged", async () => {
  const oldCourseId = oid();
  const oldSlotId = oid();
  const oldTeacherId = oid();
  const newCourseId = oid();
  const newSlotId = oid();
  const newTeacherId = oid();

  const student = await makeStudent([
    {
      courseId: oldCourseId,
      slotId: oldSlotId,
      teacherId: oldTeacherId,
      sessionType: "standard",
      deliveryMode: "online",
      paymentType: "Installment",
      PaymentStatus: "completed",
      installmentNo: 1,
      installmentTotal: 6,
      installmentAmount: 2000,
      amount: 2000,
      dueDate: daysAhead(10),
      monthlyPaymentStatus: "pending",
      feeStatus: "Paid",
    },
  ]);

  const moved = await carryForwardPendingDues({
    studentId: student._id,
    student,
    oldCourseId,
    oldSlotId,
    sessionType: "premium",
    newContext: {
      course: { _id: newCourseId },
      slot: { _id: newSlotId },
      teacher: { _id: newTeacherId },
      resolvedMode: "offline",
      resolvedBranchId: null,
    },
  });
  assert.equal(moved, true);

  const updated = await Student.findById(student._id);
  const payment = updated.payments[0];

  assert.equal(String(payment.courseId), String(newCourseId));
  assert.equal(String(payment.slotId), String(newSlotId));
  assert.equal(String(payment.teacherId), String(newTeacherId));
  assert.equal(payment.sessionType, "premium");
  assert.equal(payment.deliveryMode, "offline");

  // Terms already agreed to must not move.
  assert.equal(payment.installmentNo, 1);
  assert.equal(payment.installmentTotal, 6);
  assert.equal(payment.installmentAmount, 2000);

  const payable = getPayableInstallments(updated);
  assert.equal(payable.length, 1);
  assert.equal(String(payable[0].payment.courseId), String(newCourseId));
});

test("carryForwardPendingDues is a no-op when nothing is pending for the old enrollment", async () => {
  const oldCourseId = oid();
  const oldSlotId = oid();

  const student = await makeStudent([
    {
      courseId: oldCourseId,
      slotId: oldSlotId,
      paymentType: "Full",
      PaymentStatus: "completed",
      installmentNo: 1,
      installmentTotal: 1,
      amount: 12000,
      feeStatus: "Paid",
    },
  ]);

  const moved = await carryForwardPendingDues({
    studentId: student._id,
    student,
    oldCourseId,
    oldSlotId,
    sessionType: "standard",
    newContext: {
      course: { _id: oid() },
      slot: { _id: oid() },
      teacher: { _id: oid() },
      resolvedMode: "online",
      resolvedBranchId: null,
    },
  });
  assert.equal(moved, false);

  const untouched = await Student.findById(student._id);
  assert.equal(String(untouched.payments[0].courseId), String(oldCourseId));
});
