"use strict";

// The next due date used to be paidAt + 1 month, so a learner who first paid on
// the 14th and then paid a week late was billed on the 21st from then on — every
// late payment slid the whole schedule. The schedule is anchored on the first
// payment and advances from each installment's own due date.
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
  getNextInstallmentDueDate,
} = require("../services/enrollmentService");

const oid = () => new mongoose.Types.ObjectId();
const ist = (isoDate) => new Date(`${isoDate}T10:00:00+05:30`);
const istDay = (date) =>
  new Date(date).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
let seq = 0;

async function makeCourse() {
  seq += 1;
  return Course.create({
    name: `Course ${seq}`,
    code: `C${seq}`,
    description: "d",
    category: oid(),
    subCategory: [oid()],
    mode: "online",
    courseType: "fixed",
    termMonths: 6,
    startDate: new Date("2026-01-01"),
    endDate: new Date("2027-06-30"),
    price: [
      {
        sessionType: "standard",
        monthlyFee: 2000,
        fullPayment: 10000,
        isActive: true,
        isSelected: true,
        tenurePlans: [{ months: 6, monthlyFee: 2000, fullPayment: 10000, isActive: true }],
      },
    ],
  });
}

async function makeStudent() {
  seq += 1;
  const user = await User.create({
    name: { firstName: "Asha", lastName: "Test" },
    password: "x",
    mobileNo: 9100000000 + seq,
    email: `due${seq}@test.com`,
    accountType: "student",
  });
  return Student.create({ userId: user._id });
}

// Mirrors the real flow: installment 2+ orders carry the pending entry's dueDate.
async function payInstallment({ student, course, pricing, installmentNo, paidAt, dueDate }) {
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
    dueDate,
  });
  return Student.findById(student._id);
}

before(startMemoryMongo);
after(stopMemoryMongo);
beforeEach(clearCollections);

test("paying late or early does not move the billing day", async () => {
  const course = await makeCourse();
  const pricing = buildPricingForPlan(course, "standard", "monthly", 6);
  let student = await makeStudent();

  // First payment on the 14th — its order was opened days earlier, which must not matter.
  student = await payInstallment({
    student, course, pricing, installmentNo: 1, paidAt: ist("2026-09-14"), dueDate: ist("2026-09-10"),
  });
  let [entry] = getPayableInstallments(student, ist("2026-09-15"));
  assert.equal(istDay(entry.dueDate), "2026-10-14");

  // A week late.
  student = await payInstallment({
    student, course, pricing, installmentNo: 2, paidAt: ist("2026-10-21"), dueDate: entry.dueDate,
  });
  [entry] = getPayableInstallments(student, ist("2026-10-22"));
  assert.equal(istDay(entry.dueDate), "2026-11-14", "late payment keeps the 14th");

  // A week early.
  student = await payInstallment({
    student, course, pricing, installmentNo: 3, paidAt: ist("2026-11-07"), dueDate: entry.dueDate,
  });
  [entry] = getPayableInstallments(student, ist("2026-11-08"));
  assert.equal(istDay(entry.dueDate), "2026-12-14", "early payment keeps the 14th");
});

test("a month-end billing day falls on the last day of a short month, never skipping it", () => {
  const next = getNextInstallmentDueDate({
    paymentType: "Installment",
    courseType: "fixed",
    installmentNo: 1,
    installmentTotal: 6,
    paidAt: ist("2027-01-31"),
  });
  assert.equal(istDay(next), "2027-02-28");
});
