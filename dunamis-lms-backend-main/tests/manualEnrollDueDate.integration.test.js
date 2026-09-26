"use strict";

// The cash-at-centre path end to end: admin enrollment (installment 1) sets the
// billing day from the payment date the admin enters, and a later installment
// recorded in cash a week late keeps that day.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.MAIL_HOST = "";
process.env.CASHFREE_CLIENT_ID = process.env.CASHFREE_CLIENT_ID || "test-client-id";
process.env.CASHFREE_CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET || "test-client-secret";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

const mongoose = require("mongoose");
const Student = require("../model/student.model");
const User = require("../model/user.model");
const Course = require("../model/course.model");
const Slot = require("../model/slot.model");
const Teacher = require("../model/teacher.model");
const { adminEnrollStudent } = require("../controller/enrollmentController");
const { recordCashInstallment } = require("../controller/payments.controller");

const oid = () => new mongoose.Types.ObjectId();
const daysAhead = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
const istDay = (date) => new Date(date).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const admin = { userId: oid(), email: "admin@example.com", accountType: "admin" };
let seq = 0;

const mockRes = () => {
  const res = { statusCode: 200, body: null };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (body) => ((res.body = body), res);
  return res;
};

const call = async (handler, body) => {
  const res = mockRes();
  await handler({ body, user: admin, params: {} }, res, (err) => {
    if (err) throw err;
  });
  return res;
};

async function seed() {
  seq += 1;
  const user = await User.create({
    name: { firstName: "Cash", lastName: "Learner" },
    password: "x",
    mobileNo: 9300000000 + seq,
    email: `manual${seq}@test.com`,
    accountType: "student",
  });
  const student = await Student.create({ userId: user._id });

  const teacherUser = await User.create({
    name: { firstName: "Teach", lastName: "Er" },
    password: "x",
    mobileNo: 9400000000 + seq,
    email: `manualteach${seq}@test.com`,
    accountType: "teacher",
  });
  const teacher = await Teacher.create({ userId: teacherUser._id, teacherDetail: oid() });

  const course = await Course.create({
    name: "Guitar Basics",
    code: `MGTR${seq}`,
    mode: "online",
    teacher: [teacher._id],
    price: [
      {
        sessionType: "standard",
        monthlyFee: 2000,
        fullPayment: 12000,
        installments: 6,
        isActive: true,
        isSelected: true,
        tenurePlans: [{ months: 6, monthlyFee: 2000, fullPayment: 12000, discount: 0, isActive: true }],
      },
    ],
  });
  await Teacher.updateOne({ _id: teacher._id }, { $addToSet: { course: course._id } });

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

  return { student, course, teacher, slot };
}

before(startMemoryMongo);
// Fulfillment fires emails and teacher-stat updates without awaiting them; let
// them settle before the database goes away.
const settle = () => new Promise((resolve) => setTimeout(resolve, 500));
after(async () => {
  await settle();
  await stopMemoryMongo();
});
beforeEach(clearCollections);

test("manual enrollment anchors on the admin's payment date and a late cash installment keeps it", async () => {
  const { student, course, teacher, slot } = await seed();

  const enroll = await call(adminEnrollStudent, {
    studentId: String(student._id),
    courseId: String(course._id),
    teacherId: String(teacher._id),
    slotId: String(slot._id),
    sessionType: "standard",
    planType: "monthly",
    planMonths: 6,
    amount: 2000,
    paymentDate: "2026-09-14",
  });
  assert.equal(enroll.statusCode, 200, JSON.stringify(enroll.body));

  let fresh = await Student.findById(student._id);
  const first = fresh.payments.find((p) => p.installmentNo === 1);
  assert.equal(istDay(first.dueDate), "2026-10-14", "installment 2 falls due on the 14th");

  const cash = await call(recordCashInstallment, {
    studentId: String(student._id),
    courseId: String(course._id),
    amount: 2000,
    paymentDate: "2026-10-21",
  });
  assert.equal(cash.statusCode, 201, JSON.stringify(cash.body));

  fresh = await Student.findById(student._id);
  const second = fresh.payments.find((p) => p.installmentNo === 2);
  assert.equal(istDay(second.paidAt), "2026-10-21");
  assert.equal(istDay(second.dueDate), "2026-11-14", "paying a week late keeps the 14th");
});
