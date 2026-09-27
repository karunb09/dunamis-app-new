"use strict";

// Integration tests for the dashboard-editable communication matrix: who may
// change it, what can't be changed, and that a changed row changes delivery.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const express = require("express");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-at-least-32-chars-long-xx";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

let mails = [];
const mailSenderPath = require.resolve("../utils/mailSender");
require.cache[mailSenderPath] = {
  id: mailSenderPath,
  filename: mailSenderPath,
  loaded: true,
  exports: async (to, subject, html) => {
    mails.push({ to, subject, html });
    return { accepted: [to] };
  },
};

const matrixRoutes = require("../routes/communicationMatrix.routes");
const { errorHandler } = require("../middleware/errorHandler");
const User = require("../model/user.model");
const Admin = require("../model/admin.model");
const AdminNotice = require("../model/adminNotice.model");
const CommunicationRule = require("../model/communicationRule.model");
const { getRule, invalidateRules } = require("../utils/communicationMatrix");
const { notifyEvent } = require("../utils/notificationService");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/communication-matrix", matrixRoutes);
  app.use(errorHandler);
  return app;
}

function request(app, method, path, { body, token } = {}) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const data = body ? JSON.stringify(body) : "";
      const headers = { "content-type": "application/json", "content-length": Buffer.byteLength(data) };
      if (token) headers.authorization = `Bearer ${token}`;
      const req = http.request({ port: server.address().port, path, method, headers }, (res) => {
        let text = "";
        res.on("data", (chunk) => (text += chunk));
        res.on("end", () => {
          server.close();
          resolve({ status: res.statusCode, body: text ? JSON.parse(text) : null });
        });
      });
      req.on("error", (error) => {
        server.close();
        reject(error);
      });
      if (data) req.write(data);
      req.end();
    });
  });
}

let seq = 0;
async function makeStaff({ permission, org } = {}) {
  seq += 1;
  const user = await User.create({
    name: { firstName: "Staff", lastName: `No${seq}` },
    email: `staff${seq}@test.com`,
    mobileNo: 9000000000 + seq,
    password: "x",
    accountType: "admin",
    org,
  });
  const admin = await Admin.create({ userId: user._id, role: "Staff", permission });
  const token = jwt.sign(
    { email: user.email, userId: user._id, roleId: admin._id, accountType: "admin" },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
  return { user, token };
}

const feeReminderAsNotice = { learner: true, instructor: false, aa: true, bde: true, channel: "notification" };

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
  invalidateRules();
  mails = [];
});

test("the matrix lists every row with its defaults and locked cells", async () => {
  const { token } = await makeStaff({ permission: ["studentManagement"] });

  const res = await request(app, "GET", "/api/v1/communication-matrix", { token });

  assert.equal(res.status, 200);
  assert.equal(res.body.rows.length, 17);
  const feeReceived = res.body.rows.find((row) => row.event === "feeReceived");
  assert.equal(feeReceived.label, "Fee received");
  assert.equal(feeReceived.locked.learner, "Receipt — always sent");
  assert.deepEqual(feeReceived.current, feeReceived.defaults);
  assert.equal(feeReceived.changed, false);
});

test("only All Access or the Updates permission can change a row", async () => {
  const { token: viewer } = await makeStaff({ permission: ["studentManagement"] });
  const { token: editor } = await makeStaff({ permission: ["updates"] });

  const refused = await request(app, "PUT", "/api/v1/communication-matrix/feeReminder", {
    token: viewer,
    body: feeReminderAsNotice,
  });
  assert.equal(refused.status, 403);

  const saved = await request(app, "PUT", "/api/v1/communication-matrix/feeReminder", {
    token: editor,
    body: feeReminderAsNotice,
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.row.changed, true);
  assert.equal((await getRule("feeReminder")).channel, "notification");
});

test("a locked cell can't be changed, through the API or behind its back", async () => {
  const { token } = await makeStaff({ permission: ["allAccess"] });

  const res = await request(app, "PUT", "/api/v1/communication-matrix/courseEnrolled", {
    token,
    body: { learner: false, instructor: true, aa: true, bde: true, channel: "email" },
  });
  assert.equal(res.status, 400);

  await CommunicationRule.create({ event: "courseEnrolled", learner: false, instructor: false, aa: true, bde: true, channel: "email" });
  invalidateRules();
  const rule = await getRule("courseEnrolled");
  assert.equal(rule.learner, true, "the receipt column keeps its default");
  assert.equal(rule.instructor, false, "unlocked columns follow the override");
});

test("resetting a row brings back the code default", async () => {
  const { token } = await makeStaff({ permission: ["updates"] });
  await request(app, "PUT", "/api/v1/communication-matrix/feeReminder", { token, body: feeReminderAsNotice });

  const res = await request(app, "DELETE", "/api/v1/communication-matrix/feeReminder", { token });

  assert.equal(res.status, 200);
  assert.equal(res.body.row.changed, false);
  assert.equal((await getRule("feeReminder")).channel, "email");
});

test("switching a row's channel changes how it is delivered", async () => {
  const { token } = await makeStaff({ permission: ["updates"] });
  const { user: aa } = await makeStaff({ permission: ["studentManagement"], org: { designation: "aa" } });
  // AA only: with no BDE placed the BDE copy would fall back to every admin.
  await request(app, "PUT", "/api/v1/communication-matrix/feeReminder", {
    token,
    body: { ...feeReminderAsNotice, bde: false },
  });

  await notifyEvent({
    event: "feeReminder",
    title: "Student fee due soon",
    message: "A learner's installment is due.",
    subject: "Student fee due soon: A learner",
    html: "<p>rich email</p>",
  });

  assert.equal(mails.length, 0, "no email once the row is a notification");
  const notice = await AdminNotice.findOne({ title: "Student fee due soon" }).lean();
  assert.ok(notice);
  assert.deepEqual(notice.specificUsers.map(String), [String(aa._id)]);
});

test("a notification row switched to email gets the branded card", async () => {
  const { token } = await makeStaff({ permission: ["updates"] });
  const { user: aa } = await makeStaff({ permission: ["studentManagement"], org: { designation: "aa" } });
  await request(app, "PUT", "/api/v1/communication-matrix/signUp", {
    token,
    body: { learner: false, instructor: false, aa: true, bde: false, channel: "email" },
  });

  await notifyEvent({ event: "signUp", title: "New student registration", message: "Asha signed up." });

  assert.equal(mails.length, 1);
  assert.equal(mails[0].to, aa.email);
  assert.equal(mails[0].subject, "New student registration");
  assert.match(mails[0].html, /Asha signed up\./);
});
