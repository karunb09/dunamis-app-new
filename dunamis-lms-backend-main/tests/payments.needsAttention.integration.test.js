"use strict";

// Integration tests for the stuck-payment queue. The queue is the only way an
// admin can discover a payment that was taken but never fulfilled — the failure
// mode behind the 2026-07-12 stranded-payments incident.
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
const { listNeedsAttention, getNeedsAttentionCount } = require("../controller/payments.controller");

const oid = () => new mongoose.Types.ObjectId();
const minutesAgo = (n) => new Date(Date.now() - n * 60 * 1000);

const mockRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (body) => ((res.body = body), res);
  return res;
};

let orderSeq = 0;
const baseTxn = (overrides = {}) => ({
  userId: oid(),
  studentId: oid(),
  courseId: oid(),
  teacherId: oid(),
  slotId: oid(),
  sessionType: "standard",
  planType: "full",
  paymentType: "Full",
  amount: 5000,
  merchantOrderId: `ORDER_NA_${++orderSeq}`,
  ...overrides,
});

const listRows = async (query = {}) => {
  const res = mockRes();
  await listNeedsAttention({ validated: { query } }, res);
  return res.body;
};

before(async () => {
  await startMemoryMongo();
});
after(async () => {
  await stopMemoryMongo();
});
beforeEach(async () => {
  await clearCollections();
});

test("classifies each stuck state with the right reason and severity", async () => {
  await PaymentTransaction.create(baseTxn({ status: "paid_pending_fulfillment" }));
  await PaymentTransaction.create(
    baseTxn({ status: "paid", fulfilledAt: null, paidAt: minutesAgo(120) })
  );
  await PaymentTransaction.create(baseTxn({ status: "pending", expiresAt: minutesAgo(5) }));

  const body = await listRows({ includeAbandoned: true });
  const byReason = Object.fromEntries(body.rows.map((r) => [r.reason, r]));

  assert.equal(body.total, 3);
  assert.equal(byReason.unfulfilled_after_payment.severity, "critical");
  assert.equal(byReason.paid_never_fulfilled.severity, "critical");
  assert.equal(byReason.expired_unpaid.severity, "low");
});

test("stale pending is classified separately from expired", async () => {
  // No expiresAt, but created long ago -> stale_pending, not expired_unpaid.
  const txn = await PaymentTransaction.create(baseTxn({ status: "created", expiresAt: null }));
  // createdAt is immutable through Mongoose; go through the raw driver.
  await PaymentTransaction.collection.updateOne(
    { _id: txn._id },
    { $set: { createdAt: minutesAgo(180) } }
  );

  const body = await listRows({ includeAbandoned: true });

  assert.equal(body.total, 1);
  assert.equal(body.rows[0].reason, "stale_pending");
  assert.equal(body.rows[0].severity, "low");
});

test("default view hides abandoned checkouts, includeAbandoned reveals them", async () => {
  await PaymentTransaction.create(baseTxn({ status: "paid_pending_fulfillment" }));
  await PaymentTransaction.create(baseTxn({ status: "pending", expiresAt: minutesAgo(5) }));

  const defaultView = await listRows();
  const fullView = await listRows({ includeAbandoned: true });

  assert.equal(defaultView.total, 1);
  assert.equal(defaultView.rows[0].reason, "unfulfilled_after_payment");
  assert.equal(fullView.total, 2);
});

test("a paid row inside the 15-minute grace window is not surfaced yet", async () => {
  await PaymentTransaction.create(
    baseTxn({ status: "paid", fulfilledAt: null, paidAt: minutesAgo(5) })
  );

  const body = await listRows({ includeAbandoned: true });

  assert.equal(body.total, 0);
});

test("a fulfilled transaction never appears in the queue", async () => {
  await PaymentTransaction.create(
    baseTxn({ status: "fulfilled", paidAt: minutesAgo(120), fulfilledAt: minutesAgo(119) })
  );

  const body = await listRows({ includeAbandoned: true });

  assert.equal(body.total, 0);
});

test("count reports critical separately from total", async () => {
  await PaymentTransaction.create(baseTxn({ status: "paid_pending_fulfillment" }));
  await PaymentTransaction.create(
    baseTxn({ status: "paid", fulfilledAt: null, paidAt: minutesAgo(120) })
  );
  await PaymentTransaction.create(baseTxn({ status: "pending", expiresAt: minutesAgo(5) }));

  const res = mockRes();
  await getNeedsAttentionCount({}, res);

  assert.equal(res.body.critical, 2);
  assert.equal(res.body.total, 3);
});
