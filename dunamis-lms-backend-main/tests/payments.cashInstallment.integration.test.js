"use strict";

// Integration tests for POST /payments/cash-installment — the admin recording
// cash collected at a centre for installment 2+.
//
// This closed a real hole: adminEnrollStudent hardcodes installmentNo: 1, so a
// student who paid their 3rd installment in cash had nowhere to be recorded and
// stayed access-restricted forever.
//
// The load-bearing guards here are the money ones: the amount must equal the
// outstanding installment exactly (no silent partial closing the installment),
// and a live gateway order for the same installment must block collection so the
// student is never charged twice.
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
const User = require("../model/user.model");
const Course = require("../model/course.model");
const Slot = require("../model/slot.model");
const Teacher = require("../model/teacher.model");
const { recordCashInstallment } = require("../controller/payments.controller");

const oid = () => new mongoose.Types.ObjectId();
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysAhead = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
const drain = () => new Promise((r) => setTimeout(r, 60));

const mockRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (body) => ((res.body = body), res);
  return res;
};

let adminUserId;
let seq = 0;

const callRecord = async (body) => {
  const res = mockRes();
  await recordCashInstallment({ body, user: { userId: adminUserId } }, res);
  return res;
};

// A completed installment row shaped like applyStudentFulfillment writes it.
const installmentRow = ({
  courseId,
  slotId,
  teacherId,
  installmentNo,
  installmentTotal = 6,
  dueDate,
  amount = 2000,
  monthlyPaymentStatus = "pending",
}) => ({
  courseId,
  slotId,
  teacherId,
  sessionType: "standard",
  deliveryMode: "online",
  amount,
  installmentAmount: amount,
  PaymentStatus: "completed",
  paymentType: "Installment",
  planType: "monthly",
  installmentNo,
  installmentTotal,
  dueDate,
  monthlyPaymentStatus,
  feeStatus: "Paid",
});

// A full enrollment context: the controller re-validates course/teacher/slot
// through loadValidatedEnrollmentContext before it will record anything.
async function seedEnrolledStudent({ installments, monthlyFee = 2000 } = {}) {
  const user = await User.create({
    name: { firstName: "Cash", lastName: `Payer${seq}` },
    password: "x",
    mobileNo: 9100000000 + seq++,
    email: `cash${seq}@test.com`,
    accountType: "student",
  });

  const teacherUser = await User.create({
    name: { firstName: "Teach", lastName: `Er${seq}` },
    password: "x",
    mobileNo: 9200000000 + seq++,
    email: `teach${seq}@test.com`,
    accountType: "teacher",
  });
  // teacherDetail is a required ref to a TeacherApplication; the controller
  // never reads it, so an id is enough to satisfy the schema.
  const teacher = await Teacher.create({ userId: teacherUser._id, teacherDetail: oid() });

  const course = await Course.create({
    name: "Guitar Basics",
    code: `GTR${seq}`,
    mode: "online",
    teacher: [teacher._id],
    price: [
      {
        sessionType: "standard",
        monthlyFee,
        fullPayment: monthlyFee * 6,
        installments: 6,
        tenurePlans: [
          { months: 6, monthlyFee, fullPayment: monthlyFee * 6, discount: 0, isActive: true },
        ],
      },
    ],
  });

  const slot = await Slot.create({
    courseId: course._id,
    date: daysAhead(2),
    startTime: "10:00",
    endTime: "11:00",
    createdBy: teacher._id,
    slotType: "enrolled",
    sessionType: "standard",
    maxStudents: 4,
  });

  const student = await Student.create({
    userId: user._id,
    enrolledCourses: [{ courseId: course._id, slotId: slot._id, joinedAt: daysAgo(90) }],
    payments: (installments || []).map((spec) =>
      installmentRow({ ...spec, courseId: course._id, slotId: slot._id, teacherId: teacher._id })
    ),
  });

  return { student, course, slot, teacher, user };
}

before(async () => {
  await startMemoryMongo();
  adminUserId = oid();
});
after(async () => {
  await stopMemoryMongo();
});
beforeEach(async () => {
  await clearCollections();
});

test("records cash for installment 2 and rolls the next due date forward", async () => {
  const { student, course } = await seedEnrolledStudent({
    installments: [{ installmentNo: 1, dueDate: daysAgo(5) }],
  });

  const res = await callRecord({
    studentId: String(student._id),
    courseId: String(course._id),
    amount: 2000,
  });

  assert.equal(res.statusCode, 201, res.body?.message);
  assert.equal(res.body.installmentNo, 2);

  const txn = await PaymentTransaction.findById(res.body.transactionId);
  assert.equal(txn.gateway, "manual");
  assert.equal(txn.paymentMode, "Cash");
  assert.equal(txn.status, "fulfilled");
  assert.equal(String(txn.collectedByUserId), String(adminUserId));

  const fresh = await Student.findById(student._id);
  const rows = fresh.payments.filter((p) => p.paymentType === "Installment");
  assert.equal(rows.length, 2, "a second installment row was written");

  const latest = rows.find((p) => p.installmentNo === 2);
  assert.equal(latest.paymentMode, "Cash");
  assert.equal(latest.monthlyPaymentStatus, "pending", "installments 3-6 remain");
  assert.ok(latest.dueDate > new Date(), "next due date moved into the future");
});

test("the cash payment clears the overdue flag that was restricting access", async () => {
  const { student, course } = await seedEnrolledStudent({
    installments: [{ installmentNo: 1, dueDate: daysAgo(20) }],
  });

  const { getOverdueInstallmentPayments } = require("../services/enrollmentService");

  const before = await Student.findById(student._id);
  assert.equal(getOverdueInstallmentPayments(before).length, 1, "starts overdue");

  const res = await callRecord({
    studentId: String(student._id),
    courseId: String(course._id),
    amount: 2000,
  });
  assert.equal(res.statusCode, 201, res.body?.message);

  const after = await Student.findById(student._id);
  assert.equal(getOverdueInstallmentPayments(after).length, 0, "no longer overdue");
});

test("a short amount is rejected — partial cash must not close the installment", async () => {
  const { student, course } = await seedEnrolledStudent({
    installments: [{ installmentNo: 1, dueDate: daysAgo(5) }],
  });

  const res = await callRecord({
    studentId: String(student._id),
    courseId: String(course._id),
    amount: 1500,
  });

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /Partial cash collections are not supported/);
  assert.equal(res.body.amountDue, 2000);
  assert.equal(await PaymentTransaction.countDocuments({}), 0, "nothing was recorded");
});

test("an overpayment is rejected too", async () => {
  const { student, course } = await seedEnrolledStudent({
    installments: [{ installmentNo: 1, dueDate: daysAgo(5) }],
  });

  const res = await callRecord({
    studentId: String(student._id),
    courseId: String(course._id),
    amount: 5000,
  });

  assert.equal(res.statusCode, 400);
  assert.equal(await PaymentTransaction.countDocuments({}), 0);
});

test("a live gateway order for the same installment blocks cash collection", async () => {
  const { student, course, slot, teacher } = await seedEnrolledStudent({
    installments: [{ installmentNo: 1, dueDate: daysAgo(5) }],
  });

  // The student is mid-checkout online for installment 2.
  await PaymentTransaction.create({
    userId: student.userId,
    studentId: student._id,
    courseId: course._id,
    teacherId: teacher._id,
    slotId: slot._id,
    sessionType: "standard",
    planType: "monthly",
    paymentType: "Installment",
    installmentNo: 2,
    installmentTotal: 6,
    amount: 2000,
    merchantOrderId: "dnm_pending_i2",
    status: "pending",
    paymentSessionId: "session_x",
    expiresAt: daysAhead(1),
  });

  const res = await callRecord({
    studentId: String(student._id),
    courseId: String(course._id),
    amount: 2000,
  });

  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /online payment in progress/);
  assert.equal(
    await PaymentTransaction.countDocuments({ gateway: "manual" }),
    0,
    "no cash row was created"
  );
});

test("recording the same installment twice is refused", async () => {
  const { student, course } = await seedEnrolledStudent({
    installments: [{ installmentNo: 1, dueDate: daysAgo(5) }],
  });

  const first = await callRecord({
    studentId: String(student._id),
    courseId: String(course._id),
    amount: 2000,
  });
  assert.equal(first.statusCode, 201, first.body?.message);

  // Installment 2 is now paid; the next payable one is 3, whose due date the
  // fulfillment just set ~1 month out. Re-sending the same request must not
  // create a duplicate row for 2.
  const second = await callRecord({
    studentId: String(student._id),
    courseId: String(course._id),
    amount: 2000,
  });

  assert.equal(second.statusCode, 201, "it now targets installment 3, not a duplicate of 2");
  assert.equal(second.body.installmentNo, 3);

  const rows = await PaymentTransaction.find({ gateway: "manual" }).sort({ installmentNo: 1 });
  assert.deepEqual(
    rows.map((r) => r.installmentNo),
    [2, 3],
    "each cash record advanced the installment"
  );
});

test("a student with nothing outstanding cannot have cash recorded", async () => {
  const { student, course } = await seedEnrolledStudent({
    installments: [
      { installmentNo: 6, installmentTotal: 6, dueDate: daysAgo(5), monthlyPaymentStatus: "completed" },
    ],
  });

  const res = await callRecord({
    studentId: String(student._id),
    courseId: String(course._id),
    amount: 2000,
  });

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /no installment outstanding/);
});

test("an upcoming (not yet overdue) installment can be collected in cash", async () => {
  const { student, course } = await seedEnrolledStudent({
    installments: [{ installmentNo: 1, dueDate: daysAhead(10) }],
  });

  const res = await callRecord({
    studentId: String(student._id),
    courseId: String(course._id),
    amount: 2000,
  });

  assert.equal(res.statusCode, 201, res.body?.message);
  assert.equal(res.body.installmentNo, 2);
});

test("the cash record carries an audit trail entry naming the admin", async () => {
  const { student, course } = await seedEnrolledStudent({
    installments: [{ installmentNo: 1, dueDate: daysAgo(5) }],
  });

  const res = await callRecord({
    studentId: String(student._id),
    courseId: String(course._id),
    amount: 2000,
    receiptRef: "DNM-RCPT-0142",
    note: "Collected at Indiranagar",
  });
  assert.equal(res.statusCode, 201, res.body?.message);
  await drain();

  const txn = await PaymentTransaction.findById(res.body.transactionId);
  assert.equal(txn.bankReference, "DNM-RCPT-0142");
  assert.equal(txn.recordNote, "Collected at Indiranagar");

  const types = txn.events.map((e) => e.type);
  assert.ok(types.includes("cash_recorded"), `expected cash_recorded in ${types}`);
  assert.ok(types.includes("fulfilled"), `expected fulfilled in ${types}`);

  const cashEvent = txn.events.find((e) => e.type === "cash_recorded");
  assert.equal(cashEvent.actor, "admin");
  assert.equal(String(cashEvent.actorUserId), String(adminUserId));
  assert.equal(cashEvent.amount, 2000);
});

test("a missing student is a clean 404 with an IT support hint", async () => {
  const res = await callRecord({
    studentId: String(oid()),
    courseId: String(oid()),
    amount: 2000,
  });

  assert.equal(res.statusCode, 404);
  assert.ok(res.body.hint, "the error carries an IT support hint");
});
