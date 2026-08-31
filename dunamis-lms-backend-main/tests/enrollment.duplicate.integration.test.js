"use strict";

// A student could buy the same course twice: createOrder's only duplicate guard
// was findActiveEnrollmentTransaction, which keys on slotId/sessionType/
// paymentType, so a different slot or plan missed it entirely. Fulfilment then
// swallowed the second payment (it deduped on courseId), leaving the student
// charged with nothing to show for it.
//
// These tests pin the replacement guard: a LIVE enrollment (in-progress/paused)
// blocks; completed, discontinued and reassigned-away rows do not.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.MAIL_HOST = "";
process.env.CASHFREE_CLIENT_ID = process.env.CASHFREE_CLIENT_ID || "test-client-id";
process.env.CASHFREE_CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET || "test-client-secret";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

const mongoose = require("mongoose");
const PaymentTransaction = require("../model/paymentTransaction.model");
const Student = require("../model/student.model");
const Slot = require("../model/slot.model");
const { hasLiveEnrollment } = require("../services/enrollmentService");
const { fulfillPaidTransaction } = require("../services/paymentService");

const oid = () => new mongoose.Types.ObjectId();
const drain = () => new Promise((r) => setTimeout(r, 60));

const seedStudentWith = (enrollment) =>
  Student.create({ userId: oid(), enrolledCourses: enrollment ? [enrollment] : [] });

async function payFor({ studentId, courseId, merchantOrderId }) {
  const teacherId = oid();
  const slot = await Slot.create({
    courseId,
    date: new Date(),
    startTime: "10:00",
    endTime: "11:00",
    createdBy: teacherId,
    slotType: "enrolled",
    sessionType: "standard",
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
    merchantOrderId,
    status: "paid",
  });

  const res = await fulfillPaidTransaction(txn._id);
  await drain();
  return res;
}

const liveRows = (student, courseId) =>
  (student.enrolledCourses || []).filter(
    (e) =>
      e.courseId.toString() === courseId.toString() &&
      e.active !== false &&
      ["in-progress", "paused"].includes(e.status)
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

test("an in-progress enrollment blocks re-enrolling", async () => {
  const courseId = oid();
  const student = await seedStudentWith({ courseId, status: "in-progress" });

  assert.equal(hasLiveEnrollment(student, courseId), true);
  assert.equal(hasLiveEnrollment(student, String(courseId)), true, "string id also matches");
});

test("a paused enrollment blocks too — the seat is still held", async () => {
  const courseId = oid();
  const student = await seedStudentWith({ courseId, status: "paused" });

  assert.equal(hasLiveEnrollment(student, courseId), true);
});

test("completed and discontinued enrollments do not block", async () => {
  const courseId = oid();

  const completed = await seedStudentWith({ courseId, status: "completed" });
  assert.equal(hasLiveEnrollment(completed, courseId), false);

  const discontinued = await seedStudentWith({ courseId, status: "discontinued" });
  assert.equal(hasLiveEnrollment(discontinued, courseId), false);
});

test("an enrollment reassigned away (active:false) does not block", async () => {
  const courseId = oid();
  const student = await seedStudentWith({ courseId, status: "in-progress", active: false });

  assert.equal(hasLiveEnrollment(student, courseId), false);
});

test("a different course never blocks", async () => {
  const student = await seedStudentWith({ courseId: oid(), status: "in-progress" });

  assert.equal(hasLiveEnrollment(student, oid()), false);
});

test("re-enrolling after completion creates a fresh live row (old dedupe swallowed it)", async () => {
  const courseId = oid();
  const student = await seedStudentWith({
    courseId,
    status: "completed",
    completedAt: new Date(),
  });

  await payFor({ studentId: student._id, courseId, merchantOrderId: "ORDER_REENROLL_1" });

  const fresh = await Student.findById(student._id);
  const all = (fresh.enrolledCourses || []).filter(
    (e) => e.courseId.toString() === courseId.toString()
  );
  assert.equal(all.length, 2, "history row kept, new enrollment added");
  assert.equal(liveRows(fresh, courseId).length, 1, "exactly one live enrollment");
  assert.equal(
    all.find((e) => e.status === "completed").completedAt !== null,
    true,
    "the completed row is untouched"
  );
});

test("a second payment while live still cannot duplicate the enrollment", async () => {
  const courseId = oid();
  const student = await seedStudentWith(null);

  await payFor({ studentId: student._id, courseId, merchantOrderId: "ORDER_DUP_1" });
  // Different slot — exactly the case findActiveEnrollmentTransaction misses.
  await payFor({ studentId: student._id, courseId, merchantOrderId: "ORDER_DUP_2" });

  const fresh = await Student.findById(student._id);
  assert.equal(liveRows(fresh, courseId).length, 1, "still one live enrollment");
});
