"use strict";

// Regression test for the Outstanding tile on /admin/reports.
//
// The tile used to query PaymentTransaction for {feeStatus:"Due", dueDate<X} —
// rows that mostly do not exist, because the website creates ONE transaction at
// enrolment and then one per installment on demand. Future installments live
// only on student.payments[]. The tile therefore read near-zero regardless of
// what was actually owed.
//
// The assertion that matters: the number the report shows must equal the number
// the dues worklist shows for the same instant.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.MAIL_HOST = "";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

const mongoose = require("mongoose");
const Student = require("../model/student.model");
const User = require("../model/user.model");
const PaymentTransaction = require("../model/paymentTransaction.model");
const { buildMonthlyInsights } = require("../controller/insights.controller");
const { aggregateOutstandingInstallments } = require("../services/enrollmentService");
const { currentMonthKey } = require("../utils/istMonth");

const oid = () => new mongoose.Types.ObjectId();
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

let seq = 0;

const overdueInstallment = ({ courseId, slotId, amount, dueDate }) => ({
  courseId,
  slotId,
  sessionType: "standard",
  amount,
  installmentAmount: amount,
  PaymentStatus: "completed",
  paymentType: "Installment",
  installmentNo: 1,
  installmentTotal: 6,
  dueDate,
  monthlyPaymentStatus: "pending",
  feeStatus: "Paid",
});

async function makeStudentOwing(amount, daysLate) {
  const user = await User.create({
    name: { firstName: "Owing", lastName: `Student${seq}` },
    password: "x",
    mobileNo: 9100000000 + seq++,
    email: `owing${seq}@test.com`,
    accountType: "student",
  });
  return Student.create({
    userId: user._id,
    payments: [overdueInstallment({ courseId: oid(), slotId: oid(), amount, dueDate: daysAgo(daysLate) })],
  });
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

test("the report's Outstanding figure equals the dues worklist total", async () => {
  await makeStudentOwing(2000, 5);
  await makeStudentOwing(3500, 20);
  await makeStudentOwing(1500, 45);

  const insights = await buildMonthlyInsights({ monthKey: currentMonthKey() });
  const dues = await aggregateOutstandingInstallments({ withRows: false });

  assert.equal(insights.partial, false, "no section may fail");
  assert.equal(insights.revenue.outstanding.amount, 7000);
  assert.equal(insights.revenue.outstanding.amount, dues.totals[0].amount);
  assert.equal(insights.revenue.outstanding.count, dues.totals[0].count);
});

test("Outstanding is flagged as an as-of-today figure and carries aging", async () => {
  await makeStudentOwing(2000, 5);
  await makeStudentOwing(4000, 40);

  const insights = await buildMonthlyInsights({ monthKey: currentMonthKey() });
  const aging = Object.fromEntries(
    insights.revenue.outstanding.aging.map((a) => [a.bucket, a.amount])
  );

  assert.equal(insights.revenue.outstanding.asOfNow, true, "monthlyPaymentStatus has no history");
  assert.equal(aging["0-7"], 2000);
  assert.equal(aging["30+"], 4000);
});

test("Outstanding no longer reads zero when receivables exist but no transaction rows do", async () => {
  await makeStudentOwing(9000, 10);

  // Exactly the shape the old query looked for — deliberately absent.
  const dueTransactions = await PaymentTransaction.countDocuments({ feeStatus: "Due" });
  assert.equal(dueTransactions, 0, "future installments are not pre-created as transactions");

  const insights = await buildMonthlyInsights({ monthKey: currentMonthKey() });
  assert.equal(insights.revenue.outstanding.amount, 9000, "the old query would have reported 0 here");
});

test("a refunded transaction is picked up from a later month via the refundedAt leg", async () => {
  const studentId = oid();
  await Student.create({ _id: studentId, userId: oid() });

  // Paid two months ago, refunded today: outside both the paidAt and createdAt
  // legs of the outer $match, so only the refundedAt leg can surface it.
  const paidAt = daysAgo(65);
  const txn = await PaymentTransaction.create({
    userId: oid(),
    studentId,
    courseId: oid(),
    teacherId: oid(),
    slotId: oid(),
    sessionType: "standard",
    planType: "full",
    paymentType: "Full",
    amount: 5000,
    merchantOrderId: `dnm_refund_${Date.now()}`,
    status: "refunded",
    paidAt,
  });
  await PaymentTransaction.collection.updateOne(
    { _id: txn._id },
    { $set: { createdAt: paidAt, refundedAt: new Date(), refundAmount: 5000 } }
  );

  const insights = await buildMonthlyInsights({ monthKey: currentMonthKey() });

  assert.equal(insights.revenue.refunded.count, 1);
  assert.equal(insights.revenue.refunded.amount, 5000);
});
