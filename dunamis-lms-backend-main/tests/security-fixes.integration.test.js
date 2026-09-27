"use strict";

// Regression tests for the access-control fixes from the 2026-07-26 security
// review: self-service privilege escalation (updateUser / updateTeacher),
// password-reset OTP disclosure, free self-enrollment, and unauthorized
// feedback deletion. Each "exploit" test proves the old attack now fails;
// each "still works" test proves the fix didn't break the legitimate path.
//
// Run with:  npm run test:integration   (or npm run test:all)

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const express = require("express");
const mongoose = require("mongoose");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-at-least-32-chars-long-xx";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

// Stub outbound email before the controllers that use it are required, so
// forgotPassword's success path runs without a real SMTP connection.
const mailSenderPath = require.resolve("../utils/mailSender");
require.cache[mailSenderPath] = {
  id: mailSenderPath,
  filename: mailSenderPath,
  loaded: true,
  exports: async () => ({ accepted: [] }),
};

const userRoutes = require("../routes/user.routes");
const teacherRoutes = require("../routes/teachers.routes");
const studentRoutes = require("../routes/student.routes");
const feedbackRoutes = require("../routes/feedback.routes");
const adminRoutes = require("../routes/admin.routes");
const adminNoticeRoutes = require("../routes/adminNotice.routes");
const { errorHandler } = require("../middleware/errorHandler");

const User = require("../model/user.model");
const Teacher = require("../model/teacher.model");
const Student = require("../model/student.model");
const Feedback = require("../model/feedback.model");
const Admin = require("../model/admin.model");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/user", userRoutes);
  app.use("/api/v1/teachers", teacherRoutes);
  app.use("/api/v1/student", studentRoutes);
  app.use("/api/v1/feedback", feedbackRoutes);
  app.use("/api/v1/admin", adminRoutes);
  app.use("/api/v1/adminNotice", adminNoticeRoutes);
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

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "15m" });
}

async function seedStudent() {
  const user = await User.create({
    name: { firstName: "Stu", lastName: "Dent" },
    email: `student-${Date.now()}@example.com`,
    mobileNo: 9999999991,
    password: "secret123",
    accountType: "student",
    accountStatus: "active",
  });
  const student = await Student.create({
    userId: user._id,
    followUps: { followUp1: "pending", followUp2: "pending", followUp3: "pending" },
    adminActions: { isBlocked: false, isReported: false, isDisabled: false, isArchived: false },
  });
  user.roleId = student._id;
  await user.save();
  return { user, student };
}

async function seedTeacher() {
  const user = await User.create({
    name: { firstName: "Tea", lastName: "Cher" },
    email: `teacher-${Date.now()}@example.com`,
    mobileNo: 9999999992,
    password: "secret123",
    accountType: "teacher",
    accountStatus: "active",
    bio: "original bio",
  });
  const teacher = await Teacher.create({ userId: user._id, teacherDetail: new mongoose.Types.ObjectId() });
  user.roleId = teacher._id;
  await user.save();
  return { user, teacher };
}

async function seedAdmin() {
  return User.create({
    name: { firstName: "Ad", lastName: "Min" },
    email: `admin-${Date.now()}@example.com`,
    mobileNo: 9999999993,
    password: "secret123",
    accountType: "admin",
    accountStatus: "active",
  });
}

let staffSeq = 0;
async function seedStaff({ permission = ["studentManagement"], accountStatus = "active" } = {}) {
  staffSeq += 1;
  const user = await User.create({
    name: { firstName: "Staff", lastName: `No${staffSeq}` },
    email: `staff-${staffSeq}-${Date.now()}@example.com`,
    mobileNo: 9999990000 + staffSeq,
    password: "secret123",
    accountType: "admin",
    accountStatus,
  });
  const admin = await Admin.create({
    userId: user._id,
    role: "Staff",
    permission,
  });
  user.roleId = admin._id;
  user.roleModel = "admin";
  await user.save();
  const token = signToken({ email: user.email, userId: user._id, roleId: admin._id, accountType: "admin" });
  return { user, admin, token };
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

// --- Finding 1: updateUser mass assignment -------------------------------

test("updateUser: a student cannot self-escalate to superadmin", async () => {
  const { user } = await seedStudent();
  const token = signToken({ email: user.email, userId: user._id, roleId: user.roleId, accountType: "student" });

  const res = await request(app, "PUT", `/api/v1/user/${user._id}`, {
    token,
    body: { accountType: "superadmin" },
  });

  assert.equal(res.status, 200); // request succeeds, but the field is ignored
  const persisted = await User.findById(user._id);
  assert.equal(persisted.accountType, "student");
});

test("updateUser: admin can still change another user's status (legitimate path unaffected)", async () => {
  const { user: student } = await seedStudent();
  const admin = await seedAdmin();
  const token = signToken({ email: admin.email, userId: admin._id, roleId: admin.roleId, accountType: "admin" });

  const res = await request(app, "PUT", `/api/v1/user/${student._id}`, {
    token,
    body: { accountStatus: "inactive" },
  });

  assert.equal(res.status, 200);
  const persisted = await User.findById(student._id);
  assert.equal(persisted.accountStatus, "inactive");
});

// --- Finding 2: updateTeacher mass assignment -----------------------------

test("updateTeacher: a teacher cannot self-escalate via the nested user object", async () => {
  const { user, teacher } = await seedTeacher();
  const token = signToken({ email: user.email, userId: user._id, roleId: user.roleId, accountType: "teacher" });

  const res = await request(app, "PUT", `/api/v1/teachers/${teacher._id}`, {
    token,
    body: { user: { accountType: "superadmin", bio: "updated bio" } },
  });

  assert.equal(res.status, 200);
  const persisted = await User.findById(user._id);
  assert.equal(persisted.accountType, "teacher", "accountType must not change");
  assert.equal(persisted.bio, "updated bio", "allowlisted field still updates");
});

// --- Finding 3: forgotPassword OTP disclosure -----------------------------

test("forgotPassword: response no longer discloses the OTP", async () => {
  const { user } = await seedStudent();

  const res = await request(app, "POST", "/api/v1/user/forgot-password", {
    body: { email: user.email },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal("otp" in res.body, false, "otp must not appear anywhere in the response body");
});

// --- Finding 4: updateStudent free self-enrollment ------------------------

test("updateStudent: a student cannot grant themselves a course via enrolledCourses", async () => {
  const { user, student } = await seedStudent();
  const token = signToken({ email: user.email, userId: user._id, roleId: student._id, accountType: "student" });
  const fakeCourseId = new mongoose.Types.ObjectId();

  const res = await request(app, "PUT", `/api/v1/student/${student._id}`, {
    token,
    body: { enrolledCourses: [{ courseId: fakeCourseId.toString() }] },
  });

  assert.equal(res.status, 200);
  const persisted = await Student.findById(student._id);
  assert.equal(persisted.enrolledCourses.length, 0);
});

test("updateStudent: admin-driven enrolledCourses updates still work", async () => {
  const { student } = await seedStudent();
  const admin = await seedAdmin();
  const token = signToken({ email: admin.email, userId: admin._id, roleId: admin.roleId, accountType: "admin" });
  const courseId = new mongoose.Types.ObjectId();

  const res = await request(app, "PUT", `/api/v1/student/${student._id}`, {
    token,
    body: { enrolledCourses: [{ courseId: courseId.toString() }] },
  });

  assert.equal(res.status, 200);
  const persisted = await Student.findById(student._id);
  assert.equal(persisted.enrolledCourses.length, 1);
});

// --- Finding 5: deleteFeedback missing ownership check --------------------

test("deleteFeedback: a different student cannot delete another student's feedback", async () => {
  const { student: author } = await seedStudent();
  const { user: attackerUser, student: attacker } = await seedStudent();
  const feedback = await Feedback.create({
    courseId: new mongoose.Types.ObjectId(),
    teacherId: new mongoose.Types.ObjectId(),
    studentId: author._id,
    courseRating: 5,
    instructorRating: 5,
  });
  const token = signToken({
    email: attackerUser.email,
    userId: attackerUser._id,
    roleId: attacker._id,
    accountType: "student",
  });

  const res = await request(app, "DELETE", `/api/v1/feedback/${feedback._id}`, { token });

  assert.equal(res.status, 403);
  assert.ok(await Feedback.findById(feedback._id), "feedback must still exist");
});

test("deleteFeedback: the feedback's own author can delete it", async () => {
  const { user: authorUser, student: author } = await seedStudent();
  const feedback = await Feedback.create({
    courseId: new mongoose.Types.ObjectId(),
    teacherId: new mongoose.Types.ObjectId(),
    studentId: author._id,
    courseRating: 4,
    instructorRating: 4,
  });
  const token = signToken({
    email: authorUser.email,
    userId: authorUser._id,
    roleId: author._id,
    accountType: "student",
  });

  const res = await request(app, "DELETE", `/api/v1/feedback/${feedback._id}`, { token });

  assert.equal(res.status, 200);
  assert.equal(await Feedback.findById(feedback._id), null);
});

// --- All Access protection (org structure work, Sep 2026) -----------------
// The CEO is an ordinary admin holding allAccess, so anything that lets a
// regular admin edit that account or hand out allAccess is a full takeover.

test("updateUser: accountType is ignored even from an admin", async () => {
  const { user: teacher } = await seedTeacher();
  const { token } = await seedStaff();

  const res = await request(app, "PUT", `/api/v1/user/${teacher._id}`, {
    token,
    body: { accountType: "superadmin", roleModel: "admin" },
  });

  assert.equal(res.status, 200);
  const persisted = await User.findById(teacher._id);
  assert.equal(persisted.accountType, "teacher");
  assert.equal(persisted.roleModel, undefined);
});

test("updateUser: a regular admin cannot change an All Access admin's email", async () => {
  const { user: ceo } = await seedStaff({ permission: ["allAccess"] });
  const { token } = await seedStaff({ permission: ["adminManagement"] });

  const res = await request(app, "PUT", `/api/v1/user/${ceo._id}`, {
    token,
    body: { email: "attacker@example.com" },
  });

  assert.equal(res.status, 403);
  assert.ok(res.body.hint);
  const persisted = await User.findById(ceo._id);
  assert.equal(persisted.email, ceo.email);
});

test("updateUser: an All Access admin can still edit another All Access admin", async () => {
  const { user: other } = await seedStaff({ permission: ["allAccess"] });
  const { token } = await seedStaff({ permission: ["allAccess"] });

  const res = await request(app, "PUT", `/api/v1/user/${other._id}`, {
    token,
    body: { bio: "updated" },
  });

  assert.equal(res.status, 200);
  assert.equal((await User.findById(other._id)).bio, "updated");
});

test("updateUser: the last active All Access admin cannot be disabled", async () => {
  const { user: ceo, token } = await seedStaff({ permission: ["allAccess"] });

  const res = await request(app, "PUT", `/api/v1/user/${ceo._id}`, {
    token,
    body: { accountStatus: "inactive" },
  });

  assert.equal(res.status, 409);
  assert.ok(res.body.hint);
  assert.equal((await User.findById(ceo._id)).accountStatus, "active");
});

test("updateUser: an All Access admin can be disabled while another stays active", async () => {
  const { user: second } = await seedStaff({ permission: ["allAccess"] });
  const { token } = await seedStaff({ permission: ["allAccess"] });

  const res = await request(app, "PUT", `/api/v1/user/${second._id}`, {
    token,
    body: { accountStatus: "inactive" },
  });

  assert.equal(res.status, 200);
  assert.equal((await User.findById(second._id)).accountStatus, "inactive");
});

test("updateAdmin: an admin cannot grant themselves All Access", async () => {
  await seedStaff({ permission: ["allAccess"] });
  const { admin, token } = await seedStaff({ permission: ["adminManagement"] });

  const res = await request(app, "PUT", `/api/v1/admin/${admin._id}`, {
    token,
    body: { permission: ["adminManagement", "allAccess"] },
  });

  assert.equal(res.status, 403);
  const persisted = await Admin.findById(admin._id);
  assert.deepEqual([...persisted.permission], ["adminManagement"]);
});

test("updateAdmin: a self-edit that resends unchanged permissions still saves", async () => {
  const { user, admin, token } = await seedStaff({ permission: ["studentManagement"] });

  const res = await request(app, "PUT", `/api/v1/admin/${admin._id}`, {
    token,
    body: { name: { firstName: "Renamed" }, permission: ["studentManagement"] },
  });

  assert.equal(res.status, 200);
  assert.equal((await User.findById(user._id)).name.firstName, "Renamed");
});

test("updateAdmin: a regular admin cannot hand out Admin Management", async () => {
  const { admin: target } = await seedStaff({ permission: ["studentManagement"] });
  const { token } = await seedStaff({ permission: ["adminManagement"] });

  const res = await request(app, "PUT", `/api/v1/admin/${target._id}`, {
    token,
    body: { permission: ["studentManagement", "adminManagement"] },
  });

  assert.equal(res.status, 403);
});

test("updateAdmin: the response no longer carries the password hash", async () => {
  const { admin: target } = await seedStaff({ permission: ["studentManagement"] });
  const { token } = await seedStaff({ permission: ["adminManagement"] });

  const res = await request(app, "PUT", `/api/v1/admin/${target._id}`, {
    token,
    body: { role: "Counsellor" },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.user.password, undefined);
});

test("updateAdmin: removing All Access from the last holder is refused", async () => {
  const { admin, token } = await seedStaff({ permission: ["allAccess"] });

  const res = await request(app, "PUT", `/api/v1/admin/${admin._id}`, {
    token,
    body: { permission: ["studentManagement"] },
  });

  assert.equal(res.status, 409);
});

test("createAdmin: only an All Access admin can create another one", async () => {
  const { token: regular } = await seedStaff({ permission: ["adminManagement"] });
  const { token: ceo } = await seedStaff({ permission: ["allAccess"] });
  const body = {
    name: { firstName: "New", lastName: "Lead" },
    email: "new.lead@example.com",
    mobileNo: "9876543210",
    role: "Director",
    permission: ["allAccess"],
    org: { designation: "ceo" },
  };

  const refused = await request(app, "POST", "/api/v1/admin/create", { token: regular, body });
  assert.equal(refused.status, 403);
  assert.equal(await User.countDocuments({ email: body.email }), 0);

  const created = await request(app, "POST", "/api/v1/admin/create", { token: ceo, body });
  assert.equal(created.status, 200);
});

test("deleteAdmin: a regular admin cannot delete an All Access admin, nor the last one delete itself", async () => {
  const { admin: ceoAdmin, token: ceoToken } = await seedStaff({ permission: ["allAccess"] });
  const { token: regular } = await seedStaff({ permission: ["adminManagement"] });

  const byRegular = await request(app, "DELETE", `/api/v1/admin/${ceoAdmin._id}`, { token: regular });
  assert.equal(byRegular.status, 403);

  const bySelf = await request(app, "DELETE", `/api/v1/admin/${ceoAdmin._id}`, { token: ceoToken });
  assert.equal(bySelf.status, 409);
  assert.ok(await Admin.findById(ceoAdmin._id));
});

test("setEmployeeId: a regular admin cannot re-ID an All Access admin", async () => {
  const { user: ceo } = await seedStaff({ permission: ["allAccess"] });
  const { token } = await seedStaff({ permission: ["adminManagement"] });

  const res = await request(app, "PATCH", `/api/v1/user/${ceo._id}/employee-id`, {
    token,
    body: { employeeId: "DSMA999" },
  });

  assert.equal(res.status, 403);
});

test("adminNotice: listing notices needs an admin token", async () => {
  const anonymous = await request(app, "GET", "/api/v1/adminNotice");
  assert.equal(anonymous.status, 401);

  const { user: student } = await seedStudent();
  const studentToken = signToken({ email: student.email, userId: student._id, roleId: student.roleId, accountType: "student" });
  const asStudent = await request(app, "GET", "/api/v1/adminNotice", { token: studentToken });
  assert.equal(asStudent.status, 403);
});
