"use strict";

// Integration tests for the student fees module (/student-payments).
//
// The load-bearing case is "pay before the due date". createNextInstallmentOrder
// resolved dues through getOverdueInstallmentPayments, which filters dueDate <
// now — so the 7-day reminder email asked for a payment the portal then refused
// with "No overdue installment was found". A student could only pay once access
// had already been cut off. getPayableInstallments fixes that, and this file
// pins the behaviour.
//
// Cashfree is stubbed by overwriting the module exports; paymentService calls
// createCashfreeOrder through the module object at call time.
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
const cashfree = require("../utils/cashfreeClient");
const {
  getFeesSummary,
  createInstallmentOrder,
  recordClientEvent,
  getTransactionDetail,
} = require("../controller/studentPayments.controller");
const { getPayableInstallments } = require("../services/enrollmentService");

const oid = () => new mongoose.Types.ObjectId();
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysAhead = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

const realCreateOrder = cashfree.createCashfreeOrder;
let createOrderCalls = [];

const stubCashfree = () => {
  createOrderCalls = [];
  cashfree.createCashfreeOrder = async (payload) => {
    createOrderCalls.push(payload);
    return {
      cf_order_id: 12345,
      payment_session_id: "session_abc",
      order_status: "ACTIVE",
      order_expiry_time: daysAhead(1).toISOString(),
    };
  };
};

const mockRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (body) => ((res.body = body), res);
  return res;
};

let seq = 0;

const asStudent = (userId) => ({ userId: String(userId), accountType: "student" });

const callSummary = async (userId) => {
  const res = mockRes();
  await getFeesSummary({ user: asStudent(userId) }, res);
  return res;
};

const callOrder = async (userId, body) => {
  const res = mockRes();
  await createInstallmentOrder({ user: asStudent(userId), body }, res);
  return res;
};

const installmentRow = ({
  courseId,
  slotId,
  teacherId,
  installmentNo,
  installmentTotal = 6,
  dueDate,
  amount = 2000,
  monthlyPaymentStatus = "pending",
  paidAt = daysAgo(30),
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
  paidAt,
  monthlyPaymentStatus,
  feeStatus: "Paid",
  paymentGateway: "cashfree",
});

async function seedCourse({ name = "Guitar Basics", monthlyFee = 2000 } = {}) {
  const teacherUser = await User.create({
    name: { firstName: "Teach", lastName: `Er${seq}` },
    password: "x",
    mobileNo: 9300000000 + seq++,
    email: `t${seq}@test.com`,
    accountType: "teacher",
  });
  const teacher = await Teacher.create({ userId: teacherUser._id, teacherDetail: oid() });

  const course = await Course.create({
    name,
    code: `CD${seq}`,
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
    date: daysAhead(3),
    startTime: "10:00",
    endTime: "11:00",
    createdBy: teacher._id,
    slotType: "enrolled",
    sessionType: "standard",
    maxStudents: 4,
  });

  return { course, slot, teacher };
}

async function seedStudent(enrollments) {
  const user = await User.create({
    name: { firstName: "Stu", lastName: `Dent${seq}` },
    password: "x",
    mobileNo: 9400000000 + seq++,
    email: `s${seq}@test.com`,
    accountType: "student",
  });

  const payments = [];
  const enrolledCourses = [];
  for (const { course, slot, teacher, installments } of enrollments) {
    enrolledCourses.push({ courseId: course._id, slotId: slot._id, joinedAt: daysAgo(90) });
    for (const spec of installments) {
      payments.push(
        installmentRow({
          ...spec,
          courseId: course._id,
          slotId: slot._id,
          teacherId: teacher._id,
        })
      );
    }
  }

  const student = await Student.create({ userId: user._id, enrolledCourses, payments });
  return { student, user };
}

before(async () => {
  await startMemoryMongo();
});
after(async () => {
  cashfree.createCashfreeOrder = realCreateOrder;
  await stopMemoryMongo();
});
beforeEach(async () => {
  await clearCollections();
  stubCashfree();
});

test("an installment can be paid BEFORE its due date (the old flow refused this)", async () => {
  const { course, slot, teacher } = await seedCourse();
  const { student, user } = await seedStudent([
    { course, slot, teacher, installments: [{ installmentNo: 1, dueDate: daysAhead(6) }] },
  ]);

  // The old overdue-only resolution would have found nothing here.
  const fresh = await Student.findById(student._id);
  const { getOverdueInstallmentPayments } = require("../services/enrollmentService");
  assert.equal(getOverdueInstallmentPayments(fresh).length, 0, "nothing is overdue yet");
  assert.equal(getPayableInstallments(fresh).length, 1, "but one installment is payable");

  const res = await callOrder(user._id, { courseId: String(course._id) });

  assert.equal(res.statusCode, 200, res.body?.message);
  assert.equal(res.body.paidEarly, true);
  assert.equal(res.body.order.amount, 2000);

  const txn = await PaymentTransaction.findById(res.body.transactionId);
  assert.equal(txn.installmentNo, 2);
  assert.equal(txn.status, "pending");
});

test("an overdue installment can still be paid", async () => {
  const { course, slot, teacher } = await seedCourse();
  const { user } = await seedStudent([
    { course, slot, teacher, installments: [{ installmentNo: 1, dueDate: daysAgo(9) }] },
  ]);

  const res = await callOrder(user._id, { courseId: String(course._id) });

  assert.equal(res.statusCode, 200, res.body?.message);
  assert.equal(res.body.paidEarly, false);
});

test("the summary lists every course with dues and totals them", async () => {
  const first = await seedCourse({ name: "Guitar", monthlyFee: 2000 });
  const second = await seedCourse({ name: "Piano", monthlyFee: 3000 });

  const { user } = await seedStudent([
    {
      ...first,
      installments: [{ installmentNo: 1, dueDate: daysAgo(10), amount: 2000 }],
    },
    {
      ...second,
      installments: [{ installmentNo: 2, dueDate: daysAhead(20), amount: 3000 }],
    },
  ]);

  const res = await callSummary(user._id);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.dues.length, 2, "both enrollments appear");
  assert.equal(res.body.totals.outstanding, 5000);
  assert.equal(res.body.totals.overdueAmount, 2000);
  assert.equal(res.body.totals.overdueCount, 1);
  assert.equal(res.body.accessRestricted, true, "one course is overdue");

  const byName = Object.fromEntries(res.body.dues.map((d) => [d.courseName, d]));
  assert.equal(byName.Guitar.status, "overdue");
  assert.equal(byName.Guitar.installmentNo, 2, "the NEXT installment, not the paid one");
  assert.equal(byName.Piano.status, "upcoming");
  assert.equal(byName.Piano.installmentNo, 3);

  // Dues are ordered by due date so the most urgent is first.
  assert.equal(res.body.dues[0].courseName, "Guitar");
  assert.equal(
    new Date(res.body.totals.nextDueDate).getTime(),
    new Date(res.body.dues[0].dueDate).getTime()
  );
});

test("an installment inside the 7-day window is flagged due_soon, not upcoming", async () => {
  const { course, slot, teacher } = await seedCourse();
  const { user } = await seedStudent([
    { course, slot, teacher, installments: [{ installmentNo: 1, dueDate: daysAhead(3) }] },
  ]);

  const res = await callSummary(user._id);
  assert.equal(res.body.dues[0].status, "due_soon");
  assert.equal(res.body.accessRestricted, false, "not yet overdue, access intact");
});

test("history reports past payments and the running total paid", async () => {
  const { course, slot, teacher } = await seedCourse();
  const { user } = await seedStudent([
    {
      course,
      slot,
      teacher,
      installments: [
        { installmentNo: 1, dueDate: daysAgo(60), monthlyPaymentStatus: "completed", paidAt: daysAgo(90) },
        { installmentNo: 2, dueDate: daysAgo(30), monthlyPaymentStatus: "completed", paidAt: daysAgo(60) },
      ],
    },
  ]);

  const res = await callSummary(user._id);

  assert.equal(res.body.history.length, 2);
  assert.equal(res.body.totals.totalPaid, 4000);
  assert.equal(res.body.dues.length, 0, "nothing pending");
  assert.equal(res.body.settled.length, 1, "the course shows as fully paid");
  // Newest first.
  assert.ok(new Date(res.body.history[0].paidAt) > new Date(res.body.history[1].paidAt));
});

test("a pending order is resumed instead of creating a second charge", async () => {
  const { course, slot, teacher } = await seedCourse();
  const { user } = await seedStudent([
    { course, slot, teacher, installments: [{ installmentNo: 1, dueDate: daysAgo(5) }] },
  ]);

  const first = await callOrder(user._id, { courseId: String(course._id) });
  assert.equal(first.statusCode, 200, first.body?.message);

  const second = await callOrder(user._id, { courseId: String(course._id) });
  assert.equal(second.statusCode, 200);
  assert.equal(
    String(second.body.transactionId),
    String(first.body.transactionId),
    "the same order came back"
  );
  assert.equal(createOrderCalls.length, 1, "Cashfree was only called once");

  const txn = await PaymentTransaction.findById(first.body.transactionId);
  assert.ok(
    txn.events.some((e) => e.type === "order_reused"),
    "the reuse is on the audit trail"
  );
});

test("the summary surfaces the resumable order on the due it belongs to", async () => {
  const { course, slot, teacher } = await seedCourse();
  const { user } = await seedStudent([
    { course, slot, teacher, installments: [{ installmentNo: 1, dueDate: daysAgo(5) }] },
  ]);

  await callOrder(user._id, { courseId: String(course._id) });
  const res = await callSummary(user._id);

  assert.equal(res.body.dues.length, 1);
  assert.ok(res.body.dues[0].activeOrder, "the open checkout is attached to the due");
  assert.equal(res.body.dues[0].activeOrder.paymentSessionId, "session_abc");
});

test("a fully-paid course cannot be charged again", async () => {
  const { course, slot, teacher } = await seedCourse();
  const { user } = await seedStudent([
    {
      course,
      slot,
      teacher,
      installments: [
        { installmentNo: 6, installmentTotal: 6, dueDate: daysAgo(5), monthlyPaymentStatus: "completed" },
      ],
    },
  ]);

  const res = await callOrder(user._id, { courseId: String(course._id) });

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /no installment to pay/);
  assert.equal(createOrderCalls.length, 0);
});

test("the full lifecycle is recorded from intent to gateway order", async () => {
  const { course, slot, teacher } = await seedCourse();
  const { user } = await seedStudent([
    { course, slot, teacher, installments: [{ installmentNo: 1, dueDate: daysAgo(5) }] },
  ]);

  const order = await callOrder(user._id, { courseId: String(course._id) });
  const txnId = order.body.transactionId;

  const res = mockRes();
  await recordClientEvent(
    { user: asStudent(user._id), validated: { params: { id: String(txnId) } }, body: { type: "checkout_opened" } },
    res
  );
  assert.equal(res.statusCode, 200);

  const txn = await PaymentTransaction.findById(txnId);
  const types = txn.events.map((e) => e.type);
  assert.deepEqual(
    types,
    ["order_initiated", "order_created", "checkout_opened"],
    `unexpected trail: ${types}`
  );

  const initiated = txn.events[0];
  assert.equal(initiated.actor, "student");
  assert.equal(String(initiated.actorUserId), String(user._id));
  assert.equal(initiated.amount, 2000);
});

test("a student cannot read another student's payment", async () => {
  const { course, slot, teacher } = await seedCourse();
  const { user } = await seedStudent([
    { course, slot, teacher, installments: [{ installmentNo: 1, dueDate: daysAgo(5) }] },
  ]);
  const order = await callOrder(user._id, { courseId: String(course._id) });

  const res = mockRes();
  await getTransactionDetail(
    {
      user: asStudent(oid()),
      validated: { params: { id: String(order.body.transactionId) } },
    },
    res
  );

  assert.equal(res.statusCode, 403);
});

test("non-student accounts are refused", async () => {
  const res = mockRes();
  await getFeesSummary({ user: { userId: String(oid()), accountType: "admin" } }, res);
  assert.equal(res.statusCode, 403);
});
