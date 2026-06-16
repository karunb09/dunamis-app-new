"use strict";

// Integration tests for the Cashfree webhook handler — the highest-risk path in
// the app (money + enrollment). Exercises the REAL handler against a real
// in-memory Mongo. Run with:  npm run test:integration
//
// Covered invariants:
//   1. Webhook signature is verified (bad signature -> 401).
//   2. Unknown / malformed events are handled gracefully (200, no crash).
//   3. IDEMPOTENCY: a duplicate webhook delivery is ignored and does not
//      re-process — this is the guarantee that a retried Cashfree callback can't
//      double-fulfill an order. The dedup code is shared by every event type, so
//      it's exercised here via PAYMENT_FAILED_WEBHOOK (which, unlike SUCCESS,
//      makes no outbound Cashfree API calls and so needs no stubbing).
//
// The PAYMENT_SUCCESS fulfillment test is scaffolded at the bottom — it needs the
// Cashfree client stubbed; see the comment there.

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const crypto = require("node:crypto");
const express = require("express");

// Cashfree config must exist before the controller's webhook signature check.
process.env.CASHFREE_CLIENT_ID = process.env.CASHFREE_CLIENT_ID || "test-client-id";
process.env.CASHFREE_CLIENT_SECRET =
  process.env.CASHFREE_CLIENT_SECRET || "test-client-secret";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

const mongoose = require("mongoose");
const PaymentTransaction = require("../model/paymentTransaction.model");
const { handleCashfreeWebhook } = require("../controller/enrollmentController");

const SECRET = process.env.CASHFREE_CLIENT_SECRET;
const oid = () => new mongoose.Types.ObjectId();

// Mirror the production webhook mount (express.raw, same route).
function buildApp() {
  const app = express();
  app.post(
    "/api/v1/enrollment/cashfree-webhook",
    express.raw({ type: "application/json" }),
    handleCashfreeWebhook
  );
  return app;
}

// Sign exactly as Cashfree does: base64(HMAC-SHA256(timestamp + rawBody, secret)).
function sign(rawBody, timestamp) {
  return crypto.createHmac("sha256", SECRET).update(`${timestamp}${rawBody}`).digest("base64");
}

// Fire a raw POST at the app and resolve { status, body }.
function postWebhook(app, rawBody, headers) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      const req = http.request(
        {
          port,
          path: "/api/v1/enrollment/cashfree-webhook",
          method: "POST",
          headers: { "content-type": "application/json", "content-length": Buffer.byteLength(rawBody), ...headers },
        },
        (res) => {
          let data = "";
          res.on("data", (c) => (data += c));
          res.on("end", () => {
            server.close();
            resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
          });
        }
      );
      req.on("error", (e) => { server.close(); reject(e); });
      req.write(rawBody);
      req.end();
    });
  });
}

// Build a signed delivery of an event object.
function delivery(app, event, { idempotencyKey } = {}) {
  const rawBody = JSON.stringify(event);
  const timestamp = String(Date.now());
  const headers = {
    "x-webhook-signature": sign(rawBody, timestamp),
    "x-webhook-timestamp": timestamp,
  };
  if (idempotencyKey) headers["x-idempotency-key"] = idempotencyKey;
  return postWebhook(app, rawBody, headers);
}

async function seedTransaction(overrides = {}) {
  return PaymentTransaction.create({
    userId: oid(),
    studentId: oid(),
    courseId: oid(),
    teacherId: oid(),
    slotId: oid(),
    sessionType: "standard",
    planType: "monthly",
    paymentType: "Full",
    amount: 5000,
    merchantOrderId: "ORDER_TEST_1",
    status: "pending",
    ...overrides,
  });
}

let app;
before(async () => {
  await startMemoryMongo();
  app = buildApp();
});
after(async () => {
  await stopMemoryMongo();
});
beforeEach(async () => {
  await clearCollections();
});

test("rejects a webhook with an invalid signature (401)", async () => {
  const rawBody = JSON.stringify({ type: "PAYMENT_FAILED_WEBHOOK", data: {} });
  const res = await postWebhook(app, rawBody, {
    "x-webhook-signature": "not-a-real-signature",
    "x-webhook-timestamp": String(Date.now()),
  });
  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test("valid signature but unknown order -> 200, no crash", async () => {
  const res = await delivery(app, {
    type: "PAYMENT_FAILED_WEBHOOK",
    data: { order: { order_id: "DOES_NOT_EXIST" }, payment: { cf_payment_id: 1 } },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
});

test("event with no order id -> 200 (acknowledged, ignored)", async () => {
  const res = await delivery(app, { type: "PAYMENT_FAILED_WEBHOOK", data: {} });
  assert.equal(res.status, 200);
});

test("IDEMPOTENCY: duplicate webhook is ignored and not re-processed", async () => {
  await seedTransaction({ status: "pending" });

  const event = {
    type: "PAYMENT_FAILED_WEBHOOK",
    event_time: new Date().toISOString(),
    data: {
      order: { order_id: "ORDER_TEST_1" },
      payment: { cf_payment_id: 98765, payment_status: "FAILED", payment_message: "card declined" },
    },
  };

  // First delivery — processed.
  const first = await delivery(app, event, { idempotencyKey: "evt-key-1" });
  assert.equal(first.status, 200);

  let txn = await PaymentTransaction.findOne({ merchantOrderId: "ORDER_TEST_1" });
  assert.equal(txn.status, "failed", "first delivery should transition status to failed");
  assert.equal(txn.webhookEvents.length, 1, "exactly one webhook event recorded");
  assert.ok(txn.webhookEventKeys.includes("evt-key-1"));

  // Second delivery, same idempotency key — must be ignored.
  const second = await delivery(app, event, { idempotencyKey: "evt-key-1" });
  assert.equal(second.status, 200);
  assert.match(second.body.message || "", /duplicate/i);

  txn = await PaymentTransaction.findOne({ merchantOrderId: "ORDER_TEST_1" });
  assert.equal(txn.webhookEvents.length, 1, "duplicate must NOT add a second event");
  assert.equal(txn.webhookEventKeys.length, 1, "duplicate must NOT add a second key");
});

// ---------------------------------------------------------------------------
// SCAFFOLD: PAYMENT_SUCCESS fulfillment.
//
// The SUCCESS branch calls getCashfreeOrder() / getCashfreePaymentsForOrder()
// (live Cashfree HTTP) and then confirmPaidCashfreeOrder() (enrollment). To test
// it, stub the Cashfree client before requiring the controller, e.g. with Node's
// module mocking:
//
//   node --experimental-test-module-mocks --test
//   const { mock } = require("node:test");
//   mock.module("../utils/cashfreeClient", { namedExports: {
//     ...require("../utils/cashfreeClient"),
//     getCashfreeOrder: async () => ({ order_status: "PAID", order_amount: 5000 }),
//     getCashfreePaymentsForOrder: async () => ([{ payment_status: "SUCCESS", cf_payment_id: 1 }]),
//   }});
//
// Then seed a full Student/Course/Slot graph, deliver a PAYMENT_SUCCESS_WEBHOOK,
// and assert: transaction.status === "fulfilled" AND a second identical delivery
// leaves enrollment count unchanged (idempotent fulfillment).
// test("PAYMENT_SUCCESS fulfils once and is idempotent", { skip: "needs Cashfree client stub + enrollment fixtures" }, () => {});
