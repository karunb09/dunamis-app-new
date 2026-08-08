"use strict";

// Integration tests for the payment reconciler cron — the scheduled sweep that
// catches stranded payments without anyone having to notice. Implements the
// follow-up left open by docs/INCIDENT_2026-07-12_STRANDED_PAYMENTS.md.
//
// Cashfree is stubbed via module-export overwrite; the cron calls through the
// module object for exactly this reason.
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
// The service, not the .cron wrapper — requiring the cron would register a
// node-cron timer and keep the test runner's event loop alive forever.
const reconciler = require("../services/paymentReconciler");
const { RECONCILE_BATCH } = reconciler;
// apiGapMs: 0 — the 250ms production throttle would make this suite crawl.
const reconcilePayments = () => reconciler.reconcilePayments({ apiGapMs: 0 });

const oid = () => new mongoose.Types.ObjectId();
const drain = () => new Promise((r) => setTimeout(r, 80));

const realGetOrder = cashfree.getCashfreeOrder;
const realGetPayments = cashfree.getCashfreePaymentsForOrder;

let orderCalls = 0;

// Maps merchantOrderId -> order_status so one run can exercise several outcomes.
const stubCashfreeByOrder = (statusByOrder, amount = 5000) => {
  orderCalls = 0;
  cashfree.getCashfreeOrder = async (orderId) => {
    orderCalls += 1;
    return {
      order_id: orderId,
      order_status: statusByOrder[orderId] || "ACTIVE",
      order_amount: amount,
      order_currency: "INR",
      cf_order_id: `cf_${orderId}`,
    };
  };
  cashfree.getCashfreePaymentsForOrder = async () => [
    {
      payment_status: "SUCCESS",
      payment_amount: amount,
      payment_currency: "INR",
      cf_payment_id: "cf_payment_1",
      payment_group: "upi",
      payment_completion_time: new Date().toISOString(),
    },
  ];
};

let orderSeq = 0;
async function seedTxn(status, overrides = {}) {
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

  return PaymentTransaction.create({
    userId: oid(),
    studentId,
    courseId,
    teacherId,
    slotId: slot._id,
    sessionType: "standard",
    planType: "full",
    paymentType: "Full",
    amount: 5000,
    merchantOrderId: `ORDER_RECON_${++orderSeq}`,
    status,
    ...overrides,
  });
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

test("a pending order that Cashfree reports PAID is recovered and fulfilled", async () => {
  const txn = await seedTxn("pending");
  stubCashfreeByOrder({ [txn.merchantOrderId]: "PAID" });

  await reconcilePayments();
  await drain();

  const updated = await PaymentTransaction.findById(txn._id);
  assert.equal(updated.status, "fulfilled");
  assert.equal(updated.reconcileLastStatus, "PAID");
  assert.ok(updated.reconciledAt);
});

test("the Titu case: a dropped order that Cashfree reports PAID is recovered", async () => {
  const txn = await seedTxn("dropped");
  stubCashfreeByOrder({ [txn.merchantOrderId]: "PAID" });

  await reconcilePayments();
  await drain();

  const updated = await PaymentTransaction.findById(txn._id);
  assert.equal(updated.status, "fulfilled", "a late USER_DROPPED webhook must not strand a paid order");
});

test("an EXPIRED order is moved to expired locally", async () => {
  const txn = await seedTxn("pending");
  stubCashfreeByOrder({ [txn.merchantOrderId]: "EXPIRED" });

  await reconcilePayments();

  const updated = await PaymentTransaction.findById(txn._id);
  assert.equal(updated.status, "expired");
  assert.equal(updated.reconcileLastStatus, "EXPIRED");
});

test("an ACTIVE order is left alone but increments reconcileAttempts", async () => {
  const txn = await seedTxn("pending");
  stubCashfreeByOrder({ [txn.merchantOrderId]: "ACTIVE" });

  await reconcilePayments();

  const updated = await PaymentTransaction.findById(txn._id);
  assert.equal(updated.status, "pending", "still awaiting the customer");
  assert.equal(updated.reconcileAttempts, 1);
});

test("the global stale sweep expires past-expiry orders the scan left behind", async () => {
  // Cashfree still says ACTIVE, so the scan won't expire it — but the local
  // expiresAt has passed, which is what the global sweep exists to catch.
  const txn = await seedTxn("pending", { expiresAt: new Date(Date.now() - 60 * 60 * 1000) });
  stubCashfreeByOrder({ [txn.merchantOrderId]: "ACTIVE" });

  await reconcilePayments();

  const updated = await PaymentTransaction.findById(txn._id);
  assert.equal(updated.status, "expired");
  assert.equal(updated.lastError, "Payment session expired");
});

test("the scan is bounded by the batch cap", async () => {
  const statuses = {};
  for (let i = 0; i < 8; i += 1) {
    const txn = await seedTxn("pending");
    statuses[txn.merchantOrderId] = "ACTIVE";
  }
  stubCashfreeByOrder(statuses);

  await reconcilePayments();

  assert.ok(orderCalls <= RECONCILE_BATCH, `expected <= ${RECONCILE_BATCH} calls, got ${orderCalls}`);
  assert.equal(orderCalls, 8);
});

test("a Cashfree failure on one order does not abort the batch", async () => {
  const bad = await seedTxn("pending");
  const good = await seedTxn("pending");

  orderCalls = 0;
  cashfree.getCashfreeOrder = async (orderId) => {
    orderCalls += 1;
    if (orderId === bad.merchantOrderId) throw new Error("connect ETIMEDOUT");
    return {
      order_id: orderId,
      order_status: "EXPIRED",
      order_amount: 5000,
      order_currency: "INR",
      cf_order_id: "cf_1",
    };
  };

  await reconcilePayments();

  assert.equal(orderCalls, 2, "both orders attempted");
  const badAfter = await PaymentTransaction.findById(bad._id);
  const goodAfter = await PaymentTransaction.findById(good._id);
  assert.equal(badAfter.reconcileAttempts, 1, "failed order counts an attempt");
  assert.equal(goodAfter.status, "expired", "the healthy order still processed");
});
