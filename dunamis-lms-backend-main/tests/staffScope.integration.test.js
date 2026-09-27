"use strict";

// Integration tests for server-side permission keys and scoped visibility: an
// AA placed over one branch sees that branch's learners, payments and demos
// and nothing else; permission keys are enforced by the API, not just the
// dashboard; teachers and learners are untouched.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const express = require("express");
const mongoose = require("mongoose");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-at-least-32-chars-long-xx";
process.env.MAIL_HOST = "";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

const studentRoutes = require("../routes/student.routes");
const paymentRoutes = require("../routes/payments.routes");
const demoRoutes = require("../routes/demoBooking.route");
const enquiryRoutes = require("../routes/enquiry.routes");
const userRoutes = require("../routes/user.routes");
const dashboardRoutes = require("../routes/dashboard.routes");
const orgRoutes = require("../routes/org.routes");
const { errorHandler } = require("../middleware/errorHandler");

const User = require("../model/user.model");
const Admin = require("../model/admin.model");
const Teacher = require("../model/teacher.model");
const Student = require("../model/student.model");
const Branch = require("../model/branch.model");
const Zone = require("../model/zone.model");
const City = require("../model/city.model");
const Course = require("../model/course.model");
const PaymentTransaction = require("../model/paymentTransaction.model");
const DemoBooking = require("../model/demoBooking.model");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/student", studentRoutes);
  app.use("/api/v1/payments", paymentRoutes);
  app.use("/api/v1/demoBookings", demoRoutes);
  app.use("/api/v1/enquiry", enquiryRoutes);
  app.use("/api/v1/user", userRoutes);
  app.use("/api/v1/dashboard", dashboardRoutes);
  app.use("/api/v1/org", orgRoutes);
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

const oid = () => new mongoose.Types.ObjectId();
const sign = (user, roleId) =>
  jwt.sign(
    { email: user.email, userId: user._id, roleId, accountType: user.accountType },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

let seq = 0;
const makeUser = (fields) => {
  seq += 1;
  return User.create({
    name: { firstName: fields.firstName || "User", lastName: `No${seq}` },
    email: `u${seq}@test.com`,
    mobileNo: 9000000000 + seq,
    password: "x",
    ...fields,
  });
};

async function makeAdmin({ permission, org, accountStatus = "active" }) {
  const user = await makeUser({ accountType: "admin", accountStatus, org });
  const admin = await Admin.create({ userId: user._id, role: "Staff", permission });
  await User.updateOne({ _id: user._id }, { roleId: admin._id, roleModel: "admin" });
  return { user, token: sign(user, admin._id) };
}

// Raw inserts: fixtures only need the fields scoping reads.
async function makeStudent({ firstName, payments = [], demoCourse = [] }) {
  const user = await makeUser({ accountType: "student", firstName });
  const { insertedId } = await Student.collection.insertOne({
    userId: user._id,
    payments,
    enrolledCourses: [],
    demoCourse,
    adminActions: {},
  });
  await User.updateOne({ _id: user._id }, { roleId: insertedId, roleModel: "student" });
  return { user, studentId: insertedId };
}

const makeTxn = ({ studentId, courseId, branchId = null }) => {
  seq += 1;
  return PaymentTransaction.create({
    userId: oid(),
    studentId,
    courseId,
    branchId,
    teacherId: oid(),
    slotId: oid(),
    sessionType: "standard",
    planType: "full",
    paymentType: "Full",
    amount: 5000,
    gateway: "manual",
    merchantOrderId: `ord_${seq}`,
    status: "fulfilled",
    paidAt: new Date(),
  });
};

let app;
let w;

async function buildWorld() {
  const [hyderabad, pune] = await City.create([
    { cityName: "Hyderabad", cityManager: oid(), cityAdminContact: "1", cityAdminEmail: "c@x.com" },
    { cityName: "Pune", cityManager: oid(), cityAdminContact: "1", cityAdminEmail: "c@x.com" },
  ]);
  const [south, west] = await Zone.create([
    { name: "South", city: hyderabad._id },
    { name: "West", city: pune._id },
  ]);
  const branch = (branchName, city, zone) => ({
    branchName,
    location: "Road 1",
    branchManager: oid(),
    branchAdminEmail: "b@x.com",
    branchAdminContact: "1",
    zone,
    city,
    branchTimings: ["09:00", "20:00"],
    branchOpenDays: ["monday"],
    branchCapacity: 10,
    status: "active",
  });
  const [banjara, koregaon] = await Branch.create([
    branch("Banjara", hyderabad._id, south._id),
    branch("Koregaon", pune._id, west._id),
  ]);
  const [offlinePiano, onlineGuitar] = await Course.create([
    { name: "Offline Piano", code: "OP-1", category: oid(), subCategory: [oid()], mode: "offline", branches: [banjara._id] },
    { name: "Online Guitar", code: "OG-1", category: oid(), subCategory: [oid()], mode: "online" },
  ]);

  const atBanjara = await makeStudent({
    firstName: "Banjara",
    payments: [{ courseId: offlinePiano._id, branchId: banjara._id, PaymentStatus: "completed" }],
  });
  const atKoregaon = await makeStudent({
    firstName: "Koregaon",
    payments: [{ courseId: offlinePiano._id, branchId: koregaon._id, PaymentStatus: "completed" }],
  });
  const online = await makeStudent({
    firstName: "Online",
    payments: [{ courseId: onlineGuitar._id, branchId: null, PaymentStatus: "completed" }],
  });
  const signUp = await makeStudent({ firstName: "Signup" });

  const [banjaraTxn, koregaonTxn] = await Promise.all([
    makeTxn({ studentId: atBanjara.studentId, courseId: offlinePiano._id, branchId: banjara._id }),
    makeTxn({ studentId: atKoregaon.studentId, courseId: offlinePiano._id, branchId: koregaon._id }),
    makeTxn({ studentId: online.studentId, courseId: onlineGuitar._id }),
  ]);

  const teacherUser = await makeUser({ accountType: "teacher" });
  const teacher = await Teacher.create({ userId: teacherUser._id, teacherDetail: oid() });
  const demo = (branchId, courseId) => ({
    slotId: oid(),
    categoryId: oid(),
    courseId,
    teacherId: teacher._id,
    branchId,
    deliveryMode: branchId ? "offline" : "online",
    lead: { firstName: "Lead", lastName: "X", email: `lead${seq++}@x.com`, phone: "9000000000" },
  });
  await DemoBooking.create([demo(banjara._id, offlinePiano._id), demo(koregaon._id, offlinePiano._id)]);

  const aa = await makeAdmin({
    permission: ["studentManagement", "financials"],
    org: { designation: "aa", department: "marketing", workMode: "offline", branches: [banjara._id] },
  });
  const ceo = await makeAdmin({ permission: ["allAccess"], org: { designation: "ceo", department: "leadership" } });

  return {
    banjara,
    koregaon,
    atBanjara,
    atKoregaon,
    online,
    signUp,
    banjaraTxn,
    koregaonTxn,
    teacher: { user: teacherUser, token: sign(teacherUser, teacher._id) },
    aa,
    ceo,
  };
}

const firstNames = (students) => students.map((student) => student.userId.name.firstName).sort();

before(async () => {
  await startMemoryMongo();
  app = buildApp();
});
after(async () => {
  await stopMemoryMongo();
});
beforeEach(async () => {
  await clearCollections();
  w = await buildWorld();
});

test("a branch AA's student list is their branch plus sign-ups", async () => {
  const res = await request(app, "GET", "/api/v1/student/get-by-type", { token: w.aa.token });

  assert.equal(res.status, 200);
  assert.deepEqual(firstNames(res.body.students), ["Banjara", "Signup"]);
});

test("All Access sees every learner", async () => {
  const res = await request(app, "GET", "/api/v1/student/get-by-type", { token: w.ceo.token });

  assert.deepEqual(firstNames(res.body.students), ["Banjara", "Koregaon", "Online", "Signup"]);
});

test("another branch's learner is a 404, not a 403", async () => {
  const outside = await request(app, "GET", `/api/v1/student/${w.atKoregaon.studentId}`, { token: w.aa.token });
  const inside = await request(app, "GET", `/api/v1/student/${w.atBanjara.studentId}`, { token: w.aa.token });

  assert.equal(outside.status, 404);
  assert.equal(inside.status, 200);
});

test("payments and demo bookings are cut to the AA's branch", async () => {
  const ledger = await request(app, "GET", "/api/v1/payments", { token: w.aa.token });
  assert.equal(ledger.status, 200);
  assert.deepEqual(ledger.body.rows.map((row) => String(row._id)), [String(w.banjaraTxn._id)]);

  const detail = await request(app, "GET", `/api/v1/payments/${w.koregaonTxn._id}`, { token: w.aa.token });
  assert.equal(detail.status, 404);

  const demos = await request(app, "GET", "/api/v1/demoBookings", { token: w.aa.token });
  assert.equal(demos.status, 200);
  assert.deepEqual(demos.body.map((booking) => String(booking.branchId?._id || booking.branchId)), [String(w.banjara._id)]);
});

test("permission keys are enforced by the API", async () => {
  const enquiries = await request(app, "GET", "/api/v1/enquiry", { token: w.aa.token });
  assert.equal(enquiries.status, 403);
  assert.ok(enquiries.body.hint);

  const noKeys = await makeAdmin({ permission: [] });
  const students = await request(app, "GET", "/api/v1/student/get-by-type", { token: noKeys.token });
  assert.equal(students.status, 403, "an empty permission list is not full access on the server");
});

test("the home summary counts the AA's area and hides what they can't see", async () => {
  const res = await request(app, "GET", "/api/v1/dashboard/admin-summary", { token: w.aa.token });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.totalStudents, 2);
  assert.equal(res.body.data.bookedDemos, 1);
  assert.equal(res.body.data.newEnquiries, null);
  assert.equal(res.body.data.revenue, 5000, "financials: revenue of their branch only");
});

test("a disabled admin's token stops working at once", async () => {
  await User.updateOne({ _id: w.aa.user._id }, { accountStatus: "inactive" });

  const res = await request(app, "GET", "/api/v1/student/get-by-type", { token: w.aa.token });
  const home = await request(app, "GET", "/api/v1/dashboard/admin-summary", { token: w.aa.token });

  assert.equal(res.status, 401);
  assert.equal(home.status, 401, "not the company-wide counts either");
});

test("an admin can read their own area by name", async () => {
  const aa = await request(app, "GET", "/api/v1/org/me/scope", { token: w.aa.token });
  assert.equal(aa.status, 200);
  assert.equal(aa.body.scoped, true);
  assert.deepEqual(aa.body.branches.map((branch) => branch.branchName), ["Banjara"]);
  assert.deepEqual(aa.body.courses.map((course) => course.name), ["Offline Piano"], "courses taught at their branch");

  const ceo = await request(app, "GET", "/api/v1/org/me/scope", { token: w.ceo.token });
  assert.equal(ceo.body.scoped, false);
});

test("instructors and learners are untouched", async () => {
  const teacherDemos = await request(app, "GET", "/api/v1/demoBookings", { token: w.teacher.token });
  assert.equal(teacherDemos.status, 200);
  assert.equal(teacherDemos.body.length, 2, "their own bookings, across branches");

  const learnerToken = sign(w.atKoregaon.user, w.atKoregaon.studentId);
  const own = await request(app, "GET", `/api/v1/student/${w.atKoregaon.studentId}`, { token: learnerToken });
  assert.equal(own.status, 200);
});

test("editing a user needs the permission for that kind of account", async () => {
  const teacher = await request(app, "PUT", `/api/v1/user/${w.teacher.user._id}`, {
    token: w.aa.token,
    body: { bio: "x" },
  });
  assert.equal(teacher.status, 403, "instructors need Instructor Management");

  const self = await request(app, "PUT", `/api/v1/user/${w.aa.user._id}`, { token: w.aa.token, body: { bio: "me" } });
  assert.equal(self.status, 200);

  const learnerElsewhere = await request(app, "PUT", `/api/v1/user/${w.atKoregaon.user._id}`, {
    token: w.aa.token,
    body: { bio: "x" },
  });
  assert.equal(learnerElsewhere.status, 404);
});
