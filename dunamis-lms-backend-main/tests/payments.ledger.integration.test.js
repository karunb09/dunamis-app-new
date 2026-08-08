"use strict";

// Integration tests for GET /api/v1/payments — the ledger. Before this endpoint
// there was no way to see an individual payment anywhere in the product.
//
// The search tests matter most: search resolves student names to studentIds
// BEFORE the aggregation so the main $match stays index-eligible. That design
// is only correct if it stays precise — hence the "must not match on course
// name" case.
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
const { listPayments } = require("../controller/payments.controller");

const oid = () => new mongoose.Types.ObjectId();
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
// The IST calendar day a given instant falls on — the shape the validator
// produces and the controller expects for dateFrom/dateTo.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const istDayKey = (d) => new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

const mockRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (body) => ((res.body = body), res);
  return res;
};

const list = async (query = {}) => {
  const res = mockRes();
  await listPayments({ validated: { query } }, res);
  return res.body;
};

let seq = 0;

async function makeStudent(firstName, lastName, email) {
  const user = await User.create({
    name: { firstName, lastName },
    password: "x",
    mobileNo: 9000000000 + seq++,
    email,
    accountType: "student",
  });
  const student = await Student.create({ userId: user._id });
  return { user, student };
}

async function makeTxn({ studentId, courseId, status = "fulfilled", amount = 5000, paidAt, createdAt, gateway = "cashfree", orderId }) {
  const txn = await PaymentTransaction.create({
    userId: oid(),
    studentId: studentId || oid(),
    courseId: courseId || oid(),
    teacherId: oid(),
    slotId: oid(),
    sessionType: "standard",
    planType: "full",
    paymentType: "Full",
    amount,
    gateway,
    merchantOrderId: orderId || `dnm_${Date.now()}_${seq++}`,
    status,
    paidAt: paidAt || null,
  });
  if (createdAt) {
    // createdAt is immutable through Mongoose; go through the raw driver.
    await PaymentTransaction.collection.updateOne({ _id: txn._id }, { $set: { createdAt } });
  }
  return txn;
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

test("paginates with disjoint, correctly ordered pages and a total matching the collection", async () => {
  for (let i = 0; i < 12; i += 1) {
    await makeTxn({ createdAt: daysAgo(i) });
  }

  const p1 = await list({ page: 1, limit: 5 });
  const p2 = await list({ page: 2, limit: 5 });

  assert.equal(p1.total, 12);
  assert.equal(p1.pages, 3);
  assert.equal(p1.rows.length, 5);
  assert.equal(p2.rows.length, 5);

  const ids1 = p1.rows.map((r) => r._id.toString());
  const ids2 = p2.rows.map((r) => r._id.toString());
  assert.equal(ids1.filter((id) => ids2.includes(id)).length, 0, "pages must be disjoint");

  // Default sort is createdAt desc — page 1 is strictly newer than page 2.
  const oldestOnP1 = new Date(p1.rows[p1.rows.length - 1].createdAt).getTime();
  const newestOnP2 = new Date(p2.rows[0].createdAt).getTime();
  assert.ok(oldestOnP1 >= newestOnP2, "ordering must hold across the page boundary");

  const dbTotal = await PaymentTransaction.countDocuments({});
  assert.equal(p1.total, dbTotal);
});

test("limit is clamped to 100", async () => {
  await makeTxn({});
  const body = await list({ page: 1, limit: 99999 });
  assert.equal(body.limit, 100);
});

test("status filter narrows the result set and the totals follow it", async () => {
  await makeTxn({ status: "fulfilled", amount: 5000 });
  await makeTxn({ status: "fulfilled", amount: 3000 });
  await makeTxn({ status: "failed", amount: 999 });

  const all = await list({});
  const fulfilled = await list({ status: ["fulfilled"] });

  assert.equal(all.total, 3);
  assert.equal(fulfilled.total, 2);
  assert.equal(fulfilled.totals.gross, 8000, "totals reflect the filter, not the whole collection");
});

test("date filtering on paidAt excludes a row created in-range but never paid", async () => {
  const inRange = daysAgo(2);
  await makeTxn({ status: "fulfilled", paidAt: inRange, createdAt: inRange });
  await makeTxn({ status: "pending", paidAt: null, createdAt: inRange });

  const byPaid = await list({ dateField: "paidAt", dateFrom: istDayKey(daysAgo(5)), dateTo: istDayKey(daysAgo(0)) });
  const byCreated = await list({ dateField: "createdAt", dateFrom: istDayKey(daysAgo(5)), dateTo: istDayKey(daysAgo(0)) });

  assert.equal(byPaid.total, 1, "unpaid row has no paidAt so it cannot match");
  assert.equal(byCreated.total, 2);
});

test("recognized date mode falls back to createdAt when paidAt is absent", async () => {
  // Paid in the window, created long before it — recognized mode must catch it.
  await makeTxn({ status: "fulfilled", paidAt: daysAgo(1), createdAt: daysAgo(40) });

  const recognized = await list({ dateField: "recognized", dateFrom: istDayKey(daysAgo(3)), dateTo: istDayKey(daysAgo(0)) });
  const byCreated = await list({ dateField: "createdAt", dateFrom: istDayKey(daysAgo(3)), dateTo: istDayKey(daysAgo(0)) });

  assert.equal(recognized.total, 1);
  assert.equal(byCreated.total, 0, "createdAt mode misses it, which is why recognized exists");
});

test("date filters are IST calendar days, not UTC ones", async () => {
  // 02:00 IST on 7 Aug = 20:30 UTC on 6 Aug. Filtering "from 7 Aug" must keep
  // it; a naive UTC-midnight bound would silently drop the first 5.5 hours of
  // every IST day.
  const earlyMorningIST = new Date("2026-08-06T20:30:00.000Z");
  // 23:00 IST on 7 Aug = 17:30 UTC on 7 Aug — still the 7th in IST.
  const lateNightIST = new Date("2026-08-07T17:30:00.000Z");
  // 00:30 IST on 8 Aug = 19:00 UTC on 7 Aug — the 8th in IST, must be excluded.
  const justAfterMidnightIST = new Date("2026-08-07T19:00:00.000Z");

  await makeTxn({ status: "fulfilled", paidAt: earlyMorningIST, orderId: "dnm_early" });
  await makeTxn({ status: "fulfilled", paidAt: lateNightIST, orderId: "dnm_late" });
  await makeTxn({ status: "fulfilled", paidAt: justAfterMidnightIST, orderId: "dnm_nextday" });

  const body = await list({ dateField: "paidAt", dateFrom: "2026-08-07", dateTo: "2026-08-07" });
  const ids = body.rows.map((r) => r.merchantOrderId).sort();

  assert.deepEqual(ids, ["dnm_early", "dnm_late"], "exactly the IST-7-Aug payments");
  assert.equal(body.total, 2);
});

test("a month deep-link covers the same IST window the insights report uses", async () => {
  const { monthWindow } = require("../utils/istMonth");
  const { start, end } = monthWindow("2026-07");

  // First and last instants inside the report's July window.
  await makeTxn({ status: "fulfilled", paidAt: start, orderId: "dnm_july_first" });
  await makeTxn({ status: "fulfilled", paidAt: new Date(end.getTime() - 1), orderId: "dnm_july_last" });
  // One millisecond before the window opens, and one at the moment it closes.
  await makeTxn({ status: "fulfilled", paidAt: new Date(start.getTime() - 1), orderId: "dnm_june" });
  await makeTxn({ status: "fulfilled", paidAt: end, orderId: "dnm_august" });

  // What FinancialPage sends for ?month=2026-07 (first day → last day).
  const body = await list({ dateField: "paidAt", dateFrom: "2026-07-01", dateTo: "2026-07-31" });
  const ids = body.rows.map((r) => r.merchantOrderId).sort();

  assert.deepEqual(ids, ["dnm_july_first", "dnm_july_last"], "ledger window == report window");
});

test("search by merchantOrderId returns exactly one row and skips the person lookup", async () => {
  await makeTxn({ orderId: "dnm_unique_order_1" });
  await makeTxn({ orderId: "dnm_unique_order_2" });

  const body = await list({ search: "dnm_unique_order_1" });

  assert.equal(body.total, 1);
  assert.equal(body.rows[0].merchantOrderId, "dnm_unique_order_1");
});

test("search by student surname returns only that student's rows", async () => {
  const asha = await makeStudent("Asha", "Ramachandran", "asha@test.com");
  const ravi = await makeStudent("Ravi", "Kumar", "ravi@test.com");

  await makeTxn({ studentId: asha.student._id });
  await makeTxn({ studentId: asha.student._id });
  await makeTxn({ studentId: ravi.student._id });

  const body = await list({ search: "Ramachandran" });

  assert.equal(body.total, 2);
  assert.ok(
    body.rows.every((r) => r.student._id.toString() === asha.student._id.toString()),
    "only Asha's transactions"
  );
  assert.equal(body.rows[0].student.name, "Asha Ramachandran");
});

test("search does NOT match on course name — it resolves people only", async () => {
  const asha = await makeStudent("Asha", "Ramachandran", "asha@test.com");
  const course = await Course.create({
    name: "Ramachandran Music Method",
    code: "RMM01",
    description: "d",
    category: oid(),
  });

  await makeTxn({ studentId: asha.student._id, courseId: course._id });
  await makeTxn({ studentId: oid(), courseId: course._id });

  const body = await list({ search: "Ramachandran" });

  assert.equal(body.total, 1, "the course-name coincidence must not widen the result");
});

test("a search matching nobody returns empty rather than everything", async () => {
  await makeTxn({});
  await makeTxn({});

  const body = await list({ search: "nosuchperson" });

  assert.equal(body.total, 0);
  assert.equal(body.rows.length, 0);
});

test("rows carry the gateway offer gap for reconciliation", async () => {
  const txn = await makeTxn({ status: "fulfilled", amount: 5000 });
  await PaymentTransaction.updateOne(
    { _id: txn._id },
    { $set: { gatewayCapturedAmount: 4500, gatewayOfferDiscount: 500 } }
  );

  const body = await list({});

  assert.equal(body.rows[0].gatewayCapturedAmount, 4500);
  assert.equal(body.rows[0].gatewayOfferDiscount, 500);
  assert.equal(body.totals.captured, 4500);
  assert.equal(body.totals.gross, 5000);
});
