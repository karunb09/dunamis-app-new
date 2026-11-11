"use strict";

// Employee units (DSM, DSD, DCC, DLH, …) managed from the dashboard by All
// Access admins, and the guarded delete of a sign-up-only student account.
//
// Run with:  npm run test:integration   (or npm run test:all)

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const express = require("express");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-at-least-32-chars-long-xx";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

const employeeUnitRoutes = require("../routes/employeeUnit.routes");
const studentRoutes = require("../routes/student.routes");
const userRoutes = require("../routes/user.routes");
const { errorHandler } = require("../middleware/errorHandler");

const User = require("../model/user.model");
const Admin = require("../model/admin.model");
const Student = require("../model/student.model");
const DemoBooking = require("../model/demoBooking.model");
const EmployeeUnit = require("../model/employeeUnit.model");
const { generateEmployeeId, resolvePrefix } = require("../utils/employeeId");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/employee-units", employeeUnitRoutes);
  app.use("/api/v1/student", studentRoutes);
  app.use("/api/v1/user", userRoutes);
  app.use(errorHandler);
  return app;
}

function request(app, method, path, { body, token } = {}) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      const data = body ? JSON.stringify(body) : "";
      const headers = { "content-type": "application/json", "content-length": Buffer.byteLength(data) };
      if (token) headers.authorization = `Bearer ${token}`;
      const req = http.request({ port, path, method, headers }, (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          server.close();
          resolve({ status: res.statusCode, body: d ? JSON.parse(d) : null });
        });
      });
      req.on("error", (e) => { server.close(); reject(e); });
      if (data) req.write(data);
      req.end();
    });
  });
}

let seq = 0;
async function seedStaff(permission, extra = {}) {
  seq += 1;
  const user = await User.create({
    name: { firstName: "Staff", lastName: `No${seq}` },
    email: `staff-${seq}@example.com`,
    mobileNo: 9999990000 + seq,
    password: "secret123",
    accountType: "admin",
    accountStatus: "active",
    ...extra,
  });
  const admin = await Admin.create({ userId: user._id, role: "Staff", permission });
  user.roleId = admin._id;
  user.roleModel = "admin";
  await user.save();
  const token = jwt.sign(
    { email: user.email, userId: user._id, roleId: admin._id, accountType: "admin" },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
  return { user, token };
}

async function seedStudent(extra = {}) {
  seq += 1;
  const user = await User.create({
    name: { firstName: "Stu", lastName: `No${seq}` },
    email: `student-${seq}@example.com`,
    mobileNo: 9888880000 + seq,
    password: "secret123",
    accountType: "student",
    accountStatus: "active",
  });
  const student = await Student.create({ userId: user._id, ...extra });
  user.roleId = student._id;
  await user.save();
  return { user, student };
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

test("the unit list starts with DSM, DSD, DCC and DLH", async () => {
  const { token } = await seedStaff(["instructorManagement"]);
  const res = await request(app, "GET", "/api/v1/employee-units", { token });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.units.map((u) => u.code), ["DCC", "DLH", "DSD", "DSM"]);
  assert.ok(res.body.units.every((u) => u.isActive && u.isDefault));
  assert.equal(res.body.units.find((u) => u.code === "DLH").name, "Dunamis Language Hub");
});

test("only All Access can add a unit; IDs then generate from it", async () => {
  const { token: manager } = await seedStaff(["adminManagement"]);
  const { token: ceo } = await seedStaff(["allAccess"]);

  const denied = await request(app, "POST", "/api/v1/employee-units", { token: manager, body: { code: "DAA", name: "Arts" } });
  assert.equal(denied.status, 403);

  const bad = await request(app, "POST", "/api/v1/employee-units", { token: ceo, body: { code: "DA1", name: "Arts" } });
  assert.equal(bad.status, 400);

  const created = await request(app, "POST", "/api/v1/employee-units", { token: ceo, body: { code: "daa", name: "Dunamis Arts Academy" } });
  assert.equal(created.status, 201);
  assert.equal(created.body.unit.code, "DAA");

  const dup = await request(app, "POST", "/api/v1/employee-units", { token: ceo, body: { code: "DAA", name: "Again" } });
  assert.equal(dup.status, 409);

  assert.equal(await generateEmployeeId(await resolvePrefix("DAAI", "DSMI")), "DAAI001");
  assert.equal(await generateEmployeeId(await resolvePrefix("DLHA", "DSMA")), "DLHA001");
  assert.equal(await generateEmployeeId(await resolvePrefix(undefined, "DSMI")), "DSMI001");
});

test("a deactivated unit is refused for new IDs, not swapped for the default", async () => {
  const { token: ceo } = await seedStaff(["allAccess"]);
  await request(app, "GET", "/api/v1/employee-units", { token: ceo });
  const dlh = await EmployeeUnit.findOne({ code: "DLH" });

  const res = await request(app, "PATCH", `/api/v1/employee-units/${dlh._id}`, { token: ceo, body: { isActive: false, code: "XXX" } });
  assert.equal(res.status, 200);
  assert.equal(res.body.unit.isActive, false);
  assert.equal(res.body.unit.code, "DLH");

  await assert.rejects(resolvePrefix("DLHI", "DSMI"), (err) => err.statusCode === 400);
  await assert.rejects(resolvePrefix("XYZI", "DSMI"), (err) => err.statusCode === 400);

  // Reloading after the deactivation must not bring it back.
  await request(app, "GET", "/api/v1/employee-units", { token: ceo });
  assert.equal((await EmployeeUnit.findOne({ code: "DLH" })).isActive, false);
});

test("manual employee IDs must name a known unit (inactive ones included)", async () => {
  const { token: ceo } = await seedStaff(["allAccess"]);
  const { user: target } = await seedStaff(["courseManagement"]);
  await request(app, "GET", "/api/v1/employee-units", { token: ceo });
  await EmployeeUnit.updateOne({ code: "DCC" }, { isActive: false });

  const unknown = await request(app, "PATCH", `/api/v1/user/${target._id}/employee-id`, { token: ceo, body: { employeeId: "XYZA001" } });
  assert.equal(unknown.status, 400);

  const inactive = await request(app, "PATCH", `/api/v1/user/${target._id}/employee-id`, { token: ceo, body: { employeeId: "DCCA007" } });
  assert.equal(inactive.status, 200);
  assert.equal(inactive.body.user.employeeId, "DCCA007");
});

test("only unused, non-default units can be deleted", async () => {
  const { token: ceo } = await seedStaff(["allAccess"]);
  await request(app, "GET", "/api/v1/employee-units", { token: ceo });
  const created = await request(app, "POST", "/api/v1/employee-units", { token: ceo, body: { code: "DAA", name: "Arts" } });
  const dsm = await EmployeeUnit.findOne({ code: "DSM" });

  const builtIn = await request(app, "DELETE", `/api/v1/employee-units/${dsm._id}`, { token: ceo });
  assert.equal(builtIn.status, 409);

  await seedStaff(["courseManagement"], { employeeId: "DAAA001" });
  const inUse = await request(app, "DELETE", `/api/v1/employee-units/${created.body.unit._id}`, { token: ceo });
  assert.equal(inUse.status, 409);

  const list = await request(app, "GET", "/api/v1/employee-units", { token: ceo });
  assert.equal(list.body.units.find((u) => u.code === "DAA").staffCount, 1);

  await User.updateMany({ employeeId: "DAAA001" }, { $unset: { employeeId: 1 } });
  const ok = await request(app, "DELETE", `/api/v1/employee-units/${created.body.unit._id}`, { token: ceo });
  assert.equal(ok.status, 200);
  assert.equal(await EmployeeUnit.exists({ code: "DAA" }), null);
});

test("deleting a student: All Access only, sign-up-only accounts only", async () => {
  const { token: manager } = await seedStaff(["studentManagement"]);
  const { token: ceo } = await seedStaff(["allAccess"]);
  const { user, student } = await seedStudent();

  const denied = await request(app, "DELETE", `/api/v1/student/${student._id}`, { token: manager });
  assert.equal(denied.status, 403);

  const ok = await request(app, "DELETE", `/api/v1/student/${student._id}`, { token: ceo });
  assert.equal(ok.status, 200);
  assert.equal(await Student.exists({ _id: student._id }), null);
  assert.equal(await User.exists({ _id: user._id }), null);
});

test("deleting a student with a demo booking or enrollment is refused", async () => {
  const { token: ceo } = await seedStaff(["allAccess"]);

  const { student: withDemo } = await seedStudent();
  await DemoBooking.collection.insertOne({ studentId: withDemo._id, createdAt: new Date() });
  const demo = await request(app, "DELETE", `/api/v1/student/${withDemo._id}`, { token: ceo });
  assert.equal(demo.status, 409);
  assert.ok(demo.body.hint);

  const { student: enrolled } = await seedStudent();
  await Student.collection.updateOne(
    { _id: enrolled._id },
    { $push: { payments: { amount: 2500, PaymentStatus: "pending" } } }
  );
  const paid = await request(app, "DELETE", `/api/v1/student/${enrolled._id}`, { token: ceo });
  assert.equal(paid.status, 409);
  assert.ok(await Student.exists({ _id: enrolled._id }));
});

test("a student record linked to a non-student account is never deleted", async () => {
  const { token: ceo } = await seedStaff(["allAccess"]);
  const { user: teacherUser } = await seedStaff(["courseManagement"]);
  const student = await Student.create({ userId: teacherUser._id });

  const res = await request(app, "DELETE", `/api/v1/student/${student._id}`, { token: ceo });
  assert.equal(res.status, 409);
  assert.ok(await User.exists({ _id: teacherUser._id }));
});
