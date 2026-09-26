"use strict";

// Integration tests for the payslip renderer and its cache.
//
// The cache is the load-bearing part: a payslip must be rendered once and
// reused until the numbers on it change, and an edited adjustment must
// invalidate it without anything having to remember to delete the file.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");

process.env.MAIL_HOST = "";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

const mongoose = require("mongoose");
const Remuneration = require("../model/remuneration.model");
const { getPayslip, payslipHash, PAYSLIP_DIR } = require("../services/payslipPdf");

const oid = () => new mongoose.Types.ObjectId();

const INSTRUCTOR = {
  name: "Nidhi Rao",
  employeeId: "DSMI001",
  approvedByName: "Admin One",
};

const makeRemuneration = (overrides = {}) =>
  Remuneration.create({
    teacherId: oid(),
    month: "2026-08",
    lines: [
      {
        studentId: oid(),
        studentName: "Asha L",
        courseId: oid(),
        courseName: "Carnatic Vocals",
        categoryName: "Vocals",
        level: "beginner",
        sessionType: "standard",
        sessionsAttended: 6,
        sessionsPerMonth: 8,
        rate: 750,
        amount: 563,
      },
    ],
    demoConversions: 1,
    demoAmount: 100,
    totalEarnings: 663,
    totalEarningsInWords: "Six Hundred Sixty-Three",
    payDueDate: new Date("2026-09-06T18:30:00.000Z"),
    approvedAt: new Date("2026-09-01T05:00:00.000Z"),
    ...overrides,
  });

before(async () => {
  await startMemoryMongo();
});

after(async () => {
  await stopMemoryMongo();
  await fs.rm(PAYSLIP_DIR, { recursive: true, force: true });
});

beforeEach(async () => {
  await clearCollections();
  await fs.rm(PAYSLIP_DIR, { recursive: true, force: true });
});

test("renders a PDF and caches it on disk", async () => {
  const record = await makeRemuneration();

  const first = await getPayslip(record, INSTRUCTOR);

  assert.equal(first.cached, false);
  assert.equal(first.buffer.subarray(0, 5).toString(), "%PDF-");
  assert.ok(first.buffer.length > 1000);

  const onDisk = await fs.readFile(first.filePath);
  assert.equal(onDisk.length, first.buffer.length);
});

test("a second request reuses the cached file instead of re-rendering", async () => {
  const record = await makeRemuneration();

  const first = await getPayslip(record, INSTRUCTOR);
  record.payslipFile = {
    hash: first.hash,
    path: first.filePath,
    generatedAt: new Date(),
  };

  const second = await getPayslip(record, INSTRUCTOR);

  assert.equal(second.cached, true);
  assert.equal(second.hash, first.hash);
  assert.equal(second.buffer.length, first.buffer.length);
});

test("an edited adjustment invalidates the cache", async () => {
  const record = await makeRemuneration();
  const first = await getPayslip(record, INSTRUCTOR);
  record.payslipFile = {
    hash: first.hash,
    path: first.filePath,
    generatedAt: new Date(),
  };

  record.adjustments = [{ label: "Level upgrade bonus", amount: 500 }];
  record.totalEarnings = 1163;

  const second = await getPayslip(record, INSTRUCTOR);

  assert.equal(second.cached, false);
  assert.notEqual(second.hash, first.hash);
  // The superseded render is cleaned up rather than left behind.
  await assert.rejects(() => fs.readFile(first.filePath));
});

test("a missing cached file is re-rendered rather than throwing", async () => {
  const record = await makeRemuneration();
  const first = await getPayslip(record, INSTRUCTOR);
  record.payslipFile = {
    hash: first.hash,
    path: first.filePath,
    generatedAt: new Date(),
  };

  await fs.rm(first.filePath, { force: true });

  const second = await getPayslip(record, INSTRUCTOR);

  assert.equal(second.cached, false);
  assert.equal(second.buffer.subarray(0, 5).toString(), "%PDF-");
});

test("concurrent requests render once", async () => {
  const record = await makeRemuneration();

  const [a, b, c] = await Promise.all([
    getPayslip(record, INSTRUCTOR),
    getPayslip(record, INSTRUCTOR),
    getPayslip(record, INSTRUCTOR),
  ]);

  assert.equal(a.filePath, b.filePath);
  assert.equal(b.filePath, c.filePath);

  const files = await fs.readdir(PAYSLIP_DIR);
  assert.equal(files.length, 1);
});

test("the hash covers what is printed and ignores what is not", async () => {
  const record = await makeRemuneration();
  const base = payslipHash(record, INSTRUCTOR);

  record.payStatus = "Paid";
  assert.equal(payslipHash(record, INSTRUCTOR), base, "pay status is not printed");

  record.lines[0].amount = 700;
  assert.notEqual(payslipHash(record, INSTRUCTOR), base, "a line amount is printed");
});
