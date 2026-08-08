"use strict";

// Integration tests for the dues aggregation.
//
// The load-bearing test here is the cross-check: aggregateOutstandingInstallments
// (Mongo, all students at once) must agree exactly with getOverdueInstallmentPayments
// (JS, one hydrated student) on the same fixture. That equivalence is the whole
// justification for extracting the shared grouping — and it is what makes it safe
// to point the installment-reminder cron at the shared helper, where a silent
// divergence would mean students stop being chased for money.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.MAIL_HOST = "";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

const mongoose = require("mongoose");
const Student = require("../model/student.model");
const User = require("../model/user.model");
const {
  getLatestInstallmentPerEnrollment,
  getOverdueInstallmentPayments,
  aggregateOutstandingInstallments,
} = require("../services/enrollmentService");

// The exact grouping cronJobs/installmentReminder.js had inline before it was
// pointed at the shared helper. Kept here verbatim so the refactor is provably
// behaviour-preserving — a silent divergence would stop fee reminders going out.
const legacyInlineGrouping = (student) => {
  const latestByEnrollment = new Map();
  (student.payments || [])
    .filter(
      (payment) =>
        payment.paymentType === "Installment" &&
        payment.PaymentStatus === "completed" &&
        payment.dueDate
    )
    .forEach((payment) => {
      const key = [
        payment.courseId?._id || payment.courseId || "course",
        payment.slotId || "slot",
        payment.sessionType || "session",
      ].join(":");
      const current = latestByEnrollment.get(key);
      if (!current || Number(payment.installmentNo || 0) > Number(current.installmentNo || 0)) {
        latestByEnrollment.set(key, payment);
      }
    });
  return [...latestByEnrollment.values()];
};

const oid = () => new mongoose.Types.ObjectId();
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysAhead = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

let seq = 0;

// One completed installment row, shaped like applyStudentFulfillment writes it.
const installment = ({
  courseId,
  slotId,
  installmentNo,
  installmentTotal = 6,
  dueDate,
  monthlyPaymentStatus = "pending",
  amount = 2000,
  sessionType = "standard",
}) => ({
  courseId,
  slotId,
  sessionType,
  amount,
  installmentAmount: amount,
  PaymentStatus: "completed",
  paymentType: "Installment",
  installmentNo,
  installmentTotal,
  dueDate,
  monthlyPaymentStatus,
  feeStatus: "Paid",
});

async function makeStudent(payments, { branch = null } = {}) {
  const user = await User.create({
    name: { firstName: "Test", lastName: `Student${seq}` },
    password: "x",
    mobileNo: 9000000000 + seq++,
    email: `dues${seq}@test.com`,
    accountType: "student",
  });
  return Student.create({ userId: user._id, payments, ...(branch ? { branch } : {}) });
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

test("aggregation agrees exactly with the per-student JS implementation", async () => {
  const asOf = new Date();
  const courseA = oid();
  const courseB = oid();
  const slotA = oid();
  const slotB = oid();

  // 1. Fully paid — latest installment completed, nothing pending.
  await makeStudent([
    installment({ courseId: courseA, slotId: slotA, installmentNo: 1, dueDate: daysAgo(60), monthlyPaymentStatus: "completed" }),
    installment({ courseId: courseA, slotId: slotA, installmentNo: 2, dueDate: daysAgo(30), monthlyPaymentStatus: "completed" }),
  ]);

  // 2. Overdue by 3 days.
  await makeStudent([
    installment({ courseId: courseA, slotId: slotA, installmentNo: 1, dueDate: daysAgo(3) }),
  ]);

  // 3. Overdue by 20 days.
  await makeStudent([
    installment({ courseId: courseA, slotId: slotA, installmentNo: 1, dueDate: daysAgo(20) }),
  ]);

  // 4. Overdue by 60 days.
  await makeStudent([
    installment({ courseId: courseB, slotId: slotB, installmentNo: 2, dueDate: daysAgo(60) }),
  ]);

  // 5. Two enrollment groups, only one overdue.
  await makeStudent([
    installment({ courseId: courseA, slotId: slotA, installmentNo: 1, dueDate: daysAgo(10) }),
    installment({ courseId: courseB, slotId: slotB, installmentNo: 1, dueDate: daysAhead(10) }),
  ]);

  // 6. A higher installment is already paid — the older pending row must NOT count.
  await makeStudent([
    installment({ courseId: courseA, slotId: slotA, installmentNo: 1, dueDate: daysAgo(45) }),
    installment({ courseId: courseA, slotId: slotA, installmentNo: 2, dueDate: daysAhead(5), monthlyPaymentStatus: "pending" }),
  ]);

  // Ground truth: run the JS implementation per student.
  const students = await Student.find({});
  const expected = [];
  for (const student of students) {
    for (const payment of getOverdueInstallmentPayments(student, asOf)) {
      expected.push({
        studentId: student._id.toString(),
        courseId: payment.courseId.toString(),
        installmentNo: payment.installmentNo,
        amountDue: payment.installmentAmount || payment.amount,
      });
    }
  }

  const result = await aggregateOutstandingInstallments({ asOf, limit: 100 });
  const actual = result.rows.map((r) => ({
    studentId: r.studentId.toString(),
    courseId: r.courseId.toString(),
    installmentNo: r.installmentNo,
    amountDue: r.amountDue,
  }));

  const sortKey = (r) => `${r.studentId}:${r.courseId}:${r.installmentNo}`;
  expected.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  actual.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

  assert.equal(actual.length, 4, "students 2, 3, 4 and 5 are overdue");
  assert.deepEqual(actual, expected, "Mongo and JS implementations must agree exactly");
});

test("shared helper matches the reminder cron's previous inline grouping exactly", async () => {
  const courseA = oid();
  const courseB = oid();
  const slotA = oid();
  const slotB = oid();

  // Multiple groups, out-of-order installments, a null slotId, and a row the
  // filter must drop (not yet completed).
  await makeStudent([
    installment({ courseId: courseA, slotId: slotA, installmentNo: 2, dueDate: daysAgo(10) }),
    installment({ courseId: courseA, slotId: slotA, installmentNo: 1, dueDate: daysAgo(40) }),
    installment({ courseId: courseB, slotId: slotB, installmentNo: 3, dueDate: daysAhead(5) }),
    installment({ courseId: courseB, slotId: null, installmentNo: 1, dueDate: daysAgo(2) }),
    { ...installment({ courseId: courseA, slotId: slotA, installmentNo: 9, dueDate: daysAgo(1) }), PaymentStatus: "pending" },
  ]);

  const [student] = await Student.find({});
  const legacy = legacyInlineGrouping(student);
  const shared = getLatestInstallmentPerEnrollment(student);

  const key = (p) => `${p.courseId}:${p.slotId}:${p.sessionType}:${p.installmentNo}`;
  assert.deepEqual(
    shared.map(key).sort(),
    legacy.map(key).sort(),
    "extraction must be behaviour-preserving for the reminder cron"
  );
  assert.ok(shared.length > 0, "fixture must actually produce rows");
});

test("the older pending row is ignored when a later installment exists", async () => {
  const courseId = oid();
  const slotId = oid();

  // Installment 1 is pending and long past due, but installment 2 exists and is
  // not yet due — only the latest row counts, so this student owes nothing yet.
  await makeStudent([
    installment({ courseId, slotId, installmentNo: 1, dueDate: daysAgo(45) }),
    installment({ courseId, slotId, installmentNo: 2, dueDate: daysAhead(5) }),
  ]);

  const result = await aggregateOutstandingInstallments({ limit: 100 });

  assert.equal(result.total[0]?.count ?? 0, 0);
});

test("aging buckets and receivable totals are correct", async () => {
  const courseId = oid();

  await makeStudent([installment({ courseId, slotId: oid(), installmentNo: 1, dueDate: daysAgo(3), amount: 1000 })]);
  await makeStudent([installment({ courseId, slotId: oid(), installmentNo: 1, dueDate: daysAgo(20), amount: 2000 })]);
  await makeStudent([installment({ courseId, slotId: oid(), installmentNo: 1, dueDate: daysAgo(60), amount: 3000 })]);

  const result = await aggregateOutstandingInstallments({ limit: 100 });
  const aging = Object.fromEntries(result.aging.map((a) => [a.bucket, a]));

  assert.equal(result.totals[0].amount, 6000);
  assert.equal(result.totals[0].count, 3);
  assert.equal(result.totals[0].students, 3);
  assert.equal(aging["0-7"].amount, 1000);
  assert.equal(aging["8-30"].amount, 2000);
  assert.equal(aging["30+"].amount, 3000);
  assert.ok(result.totals[0].maxDaysLate >= 59);
});

test("bucket and minDaysLate filters narrow the set", async () => {
  const courseId = oid();
  await makeStudent([installment({ courseId, slotId: oid(), installmentNo: 1, dueDate: daysAgo(3) })]);
  await makeStudent([installment({ courseId, slotId: oid(), installmentNo: 1, dueDate: daysAgo(60) })]);

  const old = await aggregateOutstandingInstallments({ bucket: "30+", limit: 100 });
  const veryLate = await aggregateOutstandingInstallments({ minDaysLate: 30, limit: 100 });

  assert.equal(old.total[0].count, 1);
  assert.equal(veryLate.total[0].count, 1);
});

test("withRows:false returns totals without paying for the lookups", async () => {
  const courseId = oid();
  await makeStudent([installment({ courseId, slotId: oid(), installmentNo: 1, dueDate: daysAgo(9), amount: 4200 })]);

  const result = await aggregateOutstandingInstallments({ withRows: false });

  assert.equal(result.rows.length, 0);
  assert.equal(result.totals[0].amount, 4200);
});

test("rows carry the student, course and days-late an operator needs to chase", async () => {
  const courseId = oid();
  await makeStudent([installment({ courseId, slotId: oid(), installmentNo: 3, dueDate: daysAgo(12), amount: 2500 })]);

  const result = await aggregateOutstandingInstallments({ limit: 100 });
  const row = result.rows[0];

  assert.equal(row.amountDue, 2500);
  assert.equal(row.daysLate, 12);
  assert.equal(row.bucket, "8-30");
  assert.equal(row.installmentNo, 3);
  assert.ok(row.student.name.startsWith("Test Student"));
  assert.ok(row.paymentId, "paymentId is needed to target reminder/extend actions");
});
