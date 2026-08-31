"use strict";

// Integration tests for running-course billing.
//
// A running course has no finish line. The old engine treated a tenure plan as
// a finite ladder: getNextInstallmentDueDate returned null once installmentNo
// reached installmentTotal, so a learner on a 3-month plan simply stopped being
// billed after their third payment — and the UI told them "3 of 3", which reads
// as "your course is complete". Both halves are pinned here.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.MAIL_HOST = "";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

const mongoose = require("mongoose");
const Course = require("../model/course.model");
const Student = require("../model/student.model");
const User = require("../model/user.model");
const {
  applyStudentFulfillment,
  buildPricingForPlan,
  getPayableInstallments,
} = require("../services/enrollmentService");
const { installmentLabel, installmentSummary } = require("../utils/installmentLabel");

const oid = () => new mongoose.Types.ObjectId();
let seq = 0;

async function makeCourse(courseType) {
  seq += 1;
  return Course.create({
    name: `Course ${seq}`,
    code: `C${seq}`,
    description: "d",
    category: oid(),
    subCategory: [oid()],
    mode: "online",
    courseType,
    termMonths: 6,
    // Required on fixed courses only, but harmless on running ones.
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-06-30"),
    price: [
      {
        sessionType: "standard",
        monthlyFee: 2000,
        fullPayment: 5400,
        isActive: true,
        isSelected: true,
        tenurePlans: [
          { months: 3, monthlyFee: 2000, fullPayment: 5400, isActive: true },
          { months: 6, monthlyFee: 1800, fullPayment: 10000, isActive: true },
        ],
      },
    ],
  });
}

async function makeStudent() {
  seq += 1;
  const user = await User.create({
    name: { firstName: "Asha", lastName: "Test" },
    password: "x",
    mobileNo: 9000000000 + seq,
    email: `asha${seq}@test.com`,
    accountType: "student",
  });
  return Student.create({ userId: user._id });
}

// One paid installment, fulfilled through the real code path.
async function payInstallment({ student, course, pricing, installmentNo, paidAt }) {
  await applyStudentFulfillment({
    _id: oid(),
    userId: student.userId,
    studentId: student._id,
    courseId: course._id,
    teacherId: oid(),
    slotId: null,
    sessionType: "standard",
    planType: "monthly",
    planMonths: pricing.planMonths,
    paymentType: pricing.paymentType,
    installmentNo,
    installmentTotal: pricing.installmentTotal,
    installmentAmount: pricing.installmentAmount,
    courseType: pricing.courseType,
    termMonths: pricing.termMonths,
    amount: pricing.amount,
    gateway: "cashfree",
    merchantOrderId: `dnm_${seq}_${installmentNo}`,
    paidAt,
  });
  return Student.findById(student._id).populate("payments.courseId", "name code");
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

test("pricing carries the course shape onto the transaction", async () => {
  const running = await makeCourse("running");
  const pricing = buildPricingForPlan(running, "standard", "monthly", 3);

  assert.equal(pricing.courseType, "running");
  assert.equal(pricing.termMonths, 6);
  // The billing cycle stays 3 — the term does not reprice a quarterly payer.
  assert.equal(pricing.installmentTotal, 3);
});

test("a running course keeps billing past the end of its tenure", async () => {
  const course = await makeCourse("running");
  let student = await makeStudent();
  const pricing = buildPricingForPlan(course, "standard", "monthly", 3);

  for (let no = 1; no <= 3; no += 1) {
    student = await payInstallment({
      student,
      course,
      pricing,
      installmentNo: no,
      paidAt: new Date(2026, 0, no),
    });
  }

  const latest = student.payments[student.payments.length - 1];
  assert.equal(latest.installmentNo, 3);
  assert.equal(latest.installmentTotal, 3);
  assert.equal(
    latest.monthlyPaymentStatus,
    "pending",
    "the last installment of the tenure must not close the enrollment"
  );
  assert.ok(latest.dueDate, "a fourth month is scheduled");

  const payable = getPayableInstallments(student);
  assert.equal(payable.length, 1, "the student can pay again");
  assert.equal(payable[0].nextInstallmentNo, 4, "past the tenure, not capped at 3");
});

test("a fixed course still ends at its last installment", async () => {
  const course = await makeCourse("fixed");
  let student = await makeStudent();
  const pricing = buildPricingForPlan(course, "standard", "monthly", 3);

  for (let no = 1; no <= 3; no += 1) {
    student = await payInstallment({
      student,
      course,
      pricing,
      installmentNo: no,
      paidAt: new Date(2026, 0, no),
    });
  }

  const latest = student.payments[student.payments.length - 1];
  assert.equal(latest.monthlyPaymentStatus, "completed");
  assert.equal(latest.dueDate, null);
  assert.equal(getPayableInstallments(student).length, 0, "nothing left to pay");
});

test("running-course rows never render a 'N of M' counter", () => {
  const running = {
    paymentType: "Installment",
    courseType: "running",
    installmentNo: 7,
    installmentTotal: 3,
    paidAt: new Date("2026-03-14"),
  };
  const fixed = { ...running, courseType: "fixed", installmentNo: 2, installmentTotal: 6 };

  assert.equal(installmentLabel(running), null, "no counter — '7 of 3' is nonsense");
  assert.equal(installmentSummary(running), "Month of March 2026");
  assert.equal(installmentLabel(fixed), "2 of 6");
  assert.equal(installmentSummary(fixed), "2 of 6");
});

test("an outstanding running-course due is described by the month it falls due", () => {
  assert.equal(
    installmentSummary({
      paymentType: "Installment",
      courseType: "running",
      installmentNo: 4,
      installmentTotal: 3,
      dueDate: new Date("2026-09-14"),
    }),
    "Month of September 2026"
  );
});
