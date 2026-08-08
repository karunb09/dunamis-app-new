"use strict";

// Integration tests for POST /payments/:id/reverify — the admin-triggered
// recovery that replaced scripts/recoverStrandedPaidOrders.js.
//
// The headline case reproduces the 2026-07-12 incident exactly: Cashfree reports
// the order PAID but captures LESS than the order amount (a gateway-side promo).
// The old strict payment_amount check threw here, stranding genuinely-paid
// orders unfulfilled.
//
// Cashfree is stubbed by overwriting the module exports. That only works because
// the controller calls `cashfree.getCashfreeOrder(...)` through the module
// object — a destructured import would bind at require time and hit the real API.
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
const cashfree = require("../utils/cashfreeClient");
const { reverifyPayment } = require("../controller/payments.controller");

const oid = () => new mongoose.Types.ObjectId();
const drain = () => new Promise((r) => setTimeout(r, 60));

const realGetOrder = cashfree.getCashfreeOrder;
const realGetPayments = cashfree.getCashfreePaymentsForOrder;

let orderCalls = 0;

const stubCashfree = ({ orderStatus = "PAID", orderAmount = 5000, paymentAmount = 4500 } = {}) => {
  orderCalls = 0;
  cashfree.getCashfreeOrder = async (orderId) => {
    orderCalls += 1;
    return {
      order_id: orderId,
      order_status: orderStatus,
      order_amount: orderAmount,
      order_currency: "INR",
      cf_order_id: "cf_order_1",
    };
  };
  cashfree.getCashfreePaymentsForOrder = async () => [
    {
      payment_status: "SUCCESS",
      payment_amount: paymentAmount,
      payment_currency: "INR",
      cf_payment_id: "cf_payment_1",
      payment_group: "upi",
      payment_completion_time: new Date().toISOString(),
    },
  ];
};

const mockRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (body) => ((res.body = body), res);
  return res;
};

const callReverify = async (id) => {
  const res = mockRes();
  await reverifyPayment({ validated: { params: { id: String(id) } }, user: { userId: oid() } }, res);
  return res;
};

async function seedStrandedOrder(overrides = {}) {
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
    merchantOrderId: "ORDER_REVERIFY_1",
    status: "pending",
    ...overrides,
  });

  return { studentId, courseId, slot, txn };
}

before(async () => {
  await startMemoryMongo();
});
after(async () => {
  cashfree.getCashfreeOrder = realGetOrder;
  cashfree.getCashfreePaymentsForOrder = realGetPayments;
  await stopMemoryMongo();
});
beforeEach(async () => {
  await clearCollections();
});

test("the incident case: PAID with captured < order amount fulfils and records the gap", async () => {
  stubCashfree({ orderStatus: "PAID", orderAmount: 5000, paymentAmount: 4500 });
  const { studentId, courseId, slot, txn } = await seedStrandedOrder();

  const res = await callReverify(txn._id);
  await drain();

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.paid, true);
  assert.equal(res.body.fulfilled, true);
  assert.equal(res.body.capturedAmount, 4500);
  assert.equal(res.body.gatewayOfferDiscount, 500);

  const updated = await PaymentTransaction.findById(txn._id);
  assert.equal(updated.status, "fulfilled");
  assert.equal(updated.gatewayCapturedAmount, 4500);
  assert.equal(updated.gatewayOfferDiscount, 500);
  assert.ok(updated.coreFulfilledAt, "coreFulfilledAt is stamped on the success path");

  const student = await Student.findById(studentId);
  const enrolments = student.enrolledCourses.filter(
    (e) => e.courseId.toString() === courseId.toString()
  );
  assert.equal(enrolments.length, 1, "student enrolled exactly once");

  const seated = await Slot.findById(slot._id);
  assert.equal(seated.students.length, 1);
  assert.equal(seated.currentStudentsCount, 1);
});

test("re-verifying an already-fulfilled order is a no-op and skips the Cashfree call", async () => {
  stubCashfree();
  const { txn } = await seedStrandedOrder();

  await callReverify(txn._id);
  await drain();
  const callsAfterFirst = orderCalls;

  const second = await callReverify(txn._id);
  await drain();

  assert.equal(second.statusCode, 200);
  assert.equal(second.body.alreadyFulfilled, true);
  assert.equal(orderCalls, callsAfterFirst, "no second Cashfree call for a fulfilled order");

  const student = await Student.findOne({ _id: (await PaymentTransaction.findById(txn._id)).studentId });
  assert.equal(student.enrolledCourses.length, 1, "still enrolled exactly once");
});

test("an EXPIRED order leaves local state untouched", async () => {
  stubCashfree({ orderStatus: "EXPIRED" });
  const { txn } = await seedStrandedOrder();

  const res = await callReverify(txn._id);

  assert.equal(res.body.paid, false);
  assert.equal(res.body.cashfreeOrderStatus, "EXPIRED");

  const updated = await PaymentTransaction.findById(txn._id);
  assert.equal(updated.status, "pending", "local status untouched");
});

test("manual transactions are rejected — there is no gateway record to check", async () => {
  stubCashfree();
  const { txn } = await seedStrandedOrder({ gateway: "manual" });

  const res = await callReverify(txn._id);

  assert.equal(res.statusCode, 400);
  assert.equal(orderCalls, 0, "no Cashfree call for a manual transaction");
});

test("a Cashfree outage surfaces as 502, not a 500", async () => {
  const { txn } = await seedStrandedOrder();
  cashfree.getCashfreeOrder = async () => {
    throw new Error("connect ETIMEDOUT");
  };

  const res = await callReverify(txn._id);

  assert.equal(res.statusCode, 502);
  assert.match(res.body.message, /ETIMEDOUT/);
});
