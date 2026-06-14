"use strict";

// Integration tests for fulfillPaidTransaction — the post-payment enrollment
// step (the function the assessment flags as "always reuse, never duplicate").
// The critical guarantee is IDEMPOTENT fulfilment: a paid transaction enrols the
// student and seats them in the slot exactly once, and a repeat call (e.g. a
// retried webhook) must not double-enrol or double-seat.
//
// Runs against in-memory MongoDB. No Cashfree/email calls fire: the side-effect
// emailer early-returns because no Course doc is seeded, and MAIL_HOST is blanked
// as a belt-and-suspenders guard.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.MAIL_HOST = ""; // no SMTP attempts from fire-and-forget side effects
process.env.CASHFREE_CLIENT_ID = process.env.CASHFREE_CLIENT_ID || "test-client-id";
process.env.CASHFREE_CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET || "test-client-secret";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

const mongoose = require("mongoose");
const PaymentTransaction = require("../model/paymentTransaction.model");
const Student = require("../model/student.model");
const Slot = require("../model/slot.model");
const { fulfillPaidTransaction } = require("../services/paymentService");

const oid = () => new mongoose.Types.ObjectId();
// Let fire-and-forget side effects settle against the live DB before teardown.
const drain = () => new Promise((r) => setTimeout(r, 60));

async function seedPaidScenario() {
  const studentId = oid();
  const courseId = oid();
  const teacherId = oid();

  await Student.create({ _id: studentId, userId: oid() });

  const slot = await Slot.create({
    courseId,
    date: new Date(),
    startTime: "10:00",
    endTime: "11:00",
    createdBy: teacherId,
    slotType: "enrolled",
    sessionType: "standard", // maxStudents -> 4
  });

  const txn = await PaymentTransaction.create({
    userId: oid(),
    studentId,
    courseId,
    teacherId,
    slotId: slot._id,
    sessionType: "standard",
    planType: "full",
    paymentType: "Full",
    amount: 5000,
    merchantOrderId: "ORDER_FULFILL_1",
    status: "paid",
  });

  return { studentId, courseId, slot, txn };
}

const enrollmentsFor = (student, courseId) =>
  (student.enrolledCourses || []).filter(
    (e) => e.courseId.toString() === courseId.toString()
  );

before(async () => {
  await startMemoryMongo();
});
after(async () => {
  await stopMemoryMongo();
});
beforeEach(async () => {
  await clearCollections();
});

test("first fulfilment: enrols student, seats them in the slot, marks txn fulfilled", async () => {
  const { studentId, courseId, slot, txn } = await seedPaidScenario();

  const res = await fulfillPaidTransaction(txn._id);
  await drain();

  assert.equal(res.fulfilled, true);

  const student = await Student.findById(studentId);
  assert.equal(enrollmentsFor(student, courseId).length, 1, "one enrollment");

  const freshSlot = await Slot.findById(slot._id);
  assert.equal(freshSlot.students.length, 1, "one student seated");
  assert.equal(freshSlot.currentStudentsCount, 1);

  const freshTxn = await PaymentTransaction.findById(txn._id);
  assert.equal(freshTxn.status, "fulfilled");
  assert.ok(freshTxn.fulfilledAt);
});

test("IDEMPOTENT: a repeated fulfilment does not double-enrol or double-seat", async () => {
  const { studentId, courseId, slot, txn } = await seedPaidScenario();

  const first = await fulfillPaidTransaction(txn._id);
  await drain();
  const second = await fulfillPaidTransaction(txn._id);
  await drain();

  assert.equal(first.fulfilled, true);
  assert.equal(second.fulfilled, true);
  assert.equal(second.alreadyFulfilled, true, "second call short-circuits");

  const student = await Student.findById(studentId);
  assert.equal(
    enrollmentsFor(student, courseId).length,
    1,
    "still exactly one enrollment (no duplicate)"
  );

  const freshSlot = await Slot.findById(slot._id);
  assert.equal(freshSlot.students.length, 1, "still one student in slot");
  assert.equal(freshSlot.currentStudentsCount, 1);
});

test("a non-paid transaction is not fulfilled", async () => {
  const { txn } = await seedPaidScenario();
  await PaymentTransaction.updateOne({ _id: txn._id }, { $set: { status: "created" } });

  const res = await fulfillPaidTransaction(txn._id);
  assert.equal(res.fulfilled, false);
});

test("a missing transaction returns a not-found result (no throw)", async () => {
  const res = await fulfillPaidTransaction(oid());
  assert.equal(res.fulfilled, false);
  assert.match(res.error || "", /not found/i);
});
