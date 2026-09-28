"use strict";

// Integration tests for the org structure: placing admins (designation,
// manager, responsibility), placing instructors (manager, branches), the
// reporting chart's "needs attention" list, and zones as real records.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const express = require("express");
const mongoose = require("mongoose");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-at-least-32-chars-long-xx";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

const mailSenderPath = require.resolve("../utils/mailSender");
require.cache[mailSenderPath] = {
  id: mailSenderPath,
  filename: mailSenderPath,
  loaded: true,
  exports: async () => ({ accepted: [] }),
};

const adminRoutes = require("../routes/admin.routes");
const userRoutes = require("../routes/user.routes");
const orgRoutes = require("../routes/org.routes");
const zoneRoutes = require("../routes/zone.routes");
const branchRoutes = require("../routes/branch.routes");
const cityRoutes = require("../routes/city.routes");
const teacherRoutes = require("../routes/teachers.routes");
const applicationRoutes = require("../routes/teacherApplication.routes");
const { errorHandler } = require("../middleware/errorHandler");

const User = require("../model/user.model");
const Admin = require("../model/admin.model");
const Teacher = require("../model/teacher.model");
const TeacherApplication = require("../model/teacherApplication.model");
const Branch = require("../model/branch.model");
const Zone = require("../model/zone.model");
const City = require("../model/city.model");
const Course = require("../model/course.model");
const Category = require("../model/category.model");
const SubCategory = require("../model/subCategory.model");
const ClassRoster = require("../model/classRoster.model");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/admin", adminRoutes);
  app.use("/api/v1/user", userRoutes);
  app.use("/api/v1/org", orgRoutes);
  app.use("/api/v1/zone", zoneRoutes);
  app.use("/api/v1/branch", branchRoutes);
  app.use("/api/v1/city", cityRoutes);
  app.use("/api/v1/teachers", teacherRoutes);
  app.use("/api/v1/teacherApplication", applicationRoutes);
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

const tokenFor = (user, roleId) =>
  jwt.sign(
    { email: user.email, userId: user._id, roleId, accountType: user.accountType },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

let seq = 0;
async function makeStaff({ org, permission = ["adminManagement"], accountStatus = "active" } = {}) {
  seq += 1;
  const user = await User.create({
    name: { firstName: "Staff", lastName: `No${seq}` },
    email: `staff${seq}@test.com`,
    mobileNo: 9000000000 + seq,
    password: "secret123",
    accountType: "admin",
    accountStatus,
    org,
  });
  const admin = await Admin.create({ userId: user._id, role: "Staff", permission });
  user.roleId = admin._id;
  user.roleModel = "admin";
  await user.save();
  return { user, admin, token: tokenFor(user, admin._id) };
}

let app;
let world;

async function buildWorld() {
  const [hyderabad, pune] = await City.create([
    { cityName: "Hyderabad", cityManager: new mongoose.Types.ObjectId(), cityAdminContact: "1", cityAdminEmail: "c@x.com" },
    { cityName: "Pune", cityManager: new mongoose.Types.ObjectId(), cityAdminContact: "1", cityAdminEmail: "c@x.com" },
  ]);
  const [south, west] = await Zone.create([
    { name: "South", city: hyderabad._id },
    { name: "West", city: pune._id },
  ]);
  const branchFields = (name, city, zone) => ({
    branchName: name,
    location: "Road 1",
    branchManager: new mongoose.Types.ObjectId(),
    branchAdminEmail: "b@x.com",
    branchAdminContact: "1",
    zone,
    city,
    branchTimings: ["09:00", "20:00"],
    branchOpenDays: ["monday"],
    branchCapacity: 20,
    status: "active",
  });
  const [banjara, nagaram, koregaon] = await Branch.create([
    branchFields("Banjara", hyderabad._id, south._id),
    branchFields("Nagaram", hyderabad._id, south._id),
    branchFields("Koregaon", pune._id, west._id),
  ]);
  const [guitar, piano] = await SubCategory.create([{ name: "Guitar" }, { name: "Piano" }]);
  const music = await Category.create({ name: "Music", subcategories: [guitar._id, piano._id], status: "published" });
  const [onlineGuitar, offlinePiano] = await Course.create([
    { name: "Online Guitar", code: "OG-1", category: music._id, subCategory: [guitar._id], mode: "online", isPublished: false },
    { name: "Offline Piano", code: "OP-1", category: music._id, subCategory: [piano._id], mode: "offline", isPublished: false },
  ]);
  // Published separately: publishing makes many course fields required.
  await Course.updateOne({ _id: onlineGuitar._id }, { $set: { isPublished: true } });

  const ceo = await makeStaff({ org: { designation: "ceo", department: "leadership" }, permission: ["allAccess"] });
  const head = await makeStaff({
    org: { designation: "marketingHead", department: "marketing", reportsTo: ceo.user._id },
  });
  const bdm = await makeStaff({
    org: { designation: "bdm", department: "marketing", reportsTo: head.user._id, workMode: "offline", cities: [hyderabad._id] },
  });
  const bde = await makeStaff({
    org: { designation: "bde", department: "marketing", reportsTo: bdm.user._id, workMode: "offline", zones: [south._id] },
  });

  return { hyderabad, pune, south, west, banjara, nagaram, koregaon, guitar, piano, music, onlineGuitar, offlinePiano, ceo, head, bdm, bde };
}

const aaBody = (overrides = {}) => ({
  name: { firstName: "Asha", lastName: "Counsellor" },
  email: `aa${++seq}@test.com`,
  mobileNo: "9876500000",
  role: "Tele Caller",
  permission: ["studentManagement"],
  org: { designation: "aa", workMode: "offline", reportsTo: world.bde.user._id, branches: [world.banjara._id] },
  dateOfJoining: "2026-09-01",
  ...overrides,
});

before(async () => {
  await startMemoryMongo();
  app = buildApp();
});
after(async () => {
  await stopMemoryMongo();
});
beforeEach(async () => {
  await clearCollections();
  world = await buildWorld();
});

// --- Placing admins -------------------------------------------------------

test("createAdmin stores the placement, with the department taken from the designation", async () => {
  const res = await request(app, "POST", "/api/v1/admin/create", { token: world.ceo.token, body: aaBody() });

  assert.equal(res.status, 200);
  const user = await User.findById(res.body.user._id).lean();
  assert.equal(user.org.designation, "aa");
  assert.equal(user.org.department, "marketing");
  assert.equal(user.org.workMode, "offline");
  assert.deepEqual(user.org.branches.map(String), [String(world.banjara._id)]);
  assert.deepEqual(user.org.courses, []);
  const admin = await Admin.findOne({ userId: user._id }).lean();
  assert.equal(admin.department, undefined);
  assert.equal(admin.accessLevel, undefined);
});

test("an AA needs a branch for offline work and never holds zones", async () => {
  const noBranch = await request(app, "POST", "/api/v1/admin/create", {
    token: world.ceo.token,
    body: aaBody({ org: { designation: "aa", workMode: "offline", reportsTo: world.bde.user._id } }),
  });
  assert.equal(noBranch.status, 400);
  assert.match(noBranch.body.message, /An AA needs at least one branch/);

  const zones = await request(app, "POST", "/api/v1/admin/create", {
    token: world.ceo.token,
    body: aaBody({
      org: { designation: "aa", workMode: "offline", reportsTo: world.bde.user._id, branches: [world.banjara._id], zones: [world.south._id] },
    }),
  });
  assert.equal(zones.status, 400);
  assert.match(zones.body.message, /responsible for branches, not zones/);
  assert.equal(await User.countDocuments({ "org.designation": "aa" }), 0, "nothing is created on a refusal");
});

test("an AA reports to a BDE, not a BDM", async () => {
  const res = await request(app, "POST", "/api/v1/admin/create", {
    token: world.ceo.token,
    body: aaBody({ org: { designation: "aa", workMode: "offline", reportsTo: world.bdm.user._id, branches: [world.banjara._id] } }),
  });

  assert.equal(res.status, 400);
  assert.match(res.body.message, /reports to a BDE/);
});

test("company-wide roles take no scope, and online scope takes only online courses", async () => {
  const hr = await request(app, "POST", "/api/v1/admin/create", {
    token: world.ceo.token,
    body: aaBody({ role: "HR", org: { designation: "hrManager", branches: [world.banjara._id] } }),
  });
  assert.equal(hr.status, 400);
  assert.match(hr.body.message, /company-wide/);

  const offlineCourse = await request(app, "POST", "/api/v1/admin/create", {
    token: world.ceo.token,
    body: aaBody({ org: { designation: "aa", workMode: "online", reportsTo: world.bde.user._id, courses: [world.offlinePiano._id] } }),
  });
  assert.equal(offlineCourse.status, 400);
  assert.match(offlineCourse.body.message, /no longer exist/);
});

test("a reporting loop is refused", async () => {
  // bde -> bdm today. Re-placing the BDM as an AA under that same BDE would
  // make each the other's manager.
  const res = await request(app, "PATCH", `/api/v1/user/${world.bdm.user._id}/org`, {
    token: world.ceo.token,
    body: { org: { designation: "aa", workMode: "offline", reportsTo: world.bde.user._id, branches: [world.banjara._id] } },
  });

  assert.equal(res.status, 409);
  assert.match(res.body.message, /loop/);
});

test("staff can't widen their own responsibility, but can resave it unchanged", async () => {
  const { user, token } = await makeStaff({
    org: { designation: "aa", department: "marketing", workMode: "offline", reportsTo: world.bde.user._id, branches: [world.banjara._id] },
  });
  const current = { designation: "aa", workMode: "offline", reportsTo: world.bde.user._id, branches: [world.banjara._id] };

  const widen = await request(app, "PATCH", `/api/v1/user/${user._id}/org`, {
    token,
    body: { org: { ...current, branches: [world.banjara._id, world.koregaon._id] } },
  });
  assert.equal(widen.status, 403);

  const unchanged = await request(app, "PATCH", `/api/v1/user/${user._id}/org`, { token, body: { org: current } });
  assert.equal(unchanged.status, 200);
});

test("an admin with a team can't be deleted until the team moves", async () => {
  const res = await request(app, "DELETE", `/api/v1/admin/${world.bdm.admin._id}`, { token: world.ceo.token });

  assert.equal(res.status, 409);
  assert.ok(res.body.hint);
  assert.ok(await User.exists({ _id: world.bdm.user._id }));
});

// --- Directory and chart --------------------------------------------------

test("the staff directory filters by designation and hides disabled staff", async () => {
  await makeStaff({ org: { designation: "bde", department: "marketing" }, accountStatus: "inactive" });

  const res = await request(app, "GET", "/api/v1/org/staff?designations=bde,bdm", { token: world.ceo.token });

  assert.equal(res.status, 200);
  assert.deepEqual(
    res.body.staff.map((person) => person.org.designation).sort(),
    ["bde", "bdm"]
  );
  assert.ok(res.body.staff.every((person) => person.adminId));
});

test("the chart lists what still needs a person", async () => {
  await makeStaff({
    org: { designation: "aa", department: "marketing", workMode: "offline", reportsTo: world.bde.user._id, branches: [world.banjara._id] },
  });
  const unplaced = await makeStaff();

  const res = await request(app, "GET", "/api/v1/org/chart", { token: world.ceo.token });
  assert.equal(res.status, 200);
  const { needsAttention, people } = res.body;

  const missingFor = (list, name) => list.find((record) => (record.branchName || record.name) === name)?.missing;
  assert.equal(missingFor(needsAttention.uncoveredBranches, "Banjara"), undefined, "AA + BDE cover Banjara");
  assert.deepEqual(missingFor(needsAttention.uncoveredBranches, "Nagaram"), ["aa"]);
  assert.deepEqual(missingFor(needsAttention.uncoveredBranches, "Koregaon"), ["aa", "bde"]);
  assert.deepEqual(missingFor(needsAttention.uncoveredCourses, "Online Guitar"), ["aa", "bde"]);
  assert.deepEqual(needsAttention.zonesWithoutBde.map((zone) => zone.name), ["West"]);
  assert.deepEqual(needsAttention.citiesWithoutBdm.map((city) => city.cityName), ["Pune"]);
  assert.deepEqual(needsAttention.categoriesWithoutBdm.map((category) => category.name), ["Music"]);
  assert.deepEqual(needsAttention.unplaced.map(String), [String(unplaced.user._id)]);

  const bde = people.find((person) => String(person._id) === String(world.bde.user._id));
  assert.equal(bde.org.reportsTo.name.lastName, world.bdm.user.name.lastName);
  assert.equal(bde.org.zones[0].name, "South");
});

test("a profile read names the manager and the scope", async () => {
  const res = await request(app, "GET", `/api/v1/user/${world.bde.user._id}`, { token: world.ceo.token });

  assert.equal(res.status, 200);
  assert.equal(res.body.user.org.reportsTo.name.lastName, world.bdm.user.name.lastName);
  assert.equal(res.body.user.org.zones[0].name, "South");
});

// --- Instructors ------------------------------------------------------------

const instructorBody = (overrides = {}) => ({
  firstName: "Ravi",
  lastName: "Guitar",
  email: `ravi${++seq}@test.com`,
  mobileNo: "9876543210",
  gender: "male",
  readLanguage: ["English"],
  speakLanguage: ["English"],
  teachLanguage: ["English"],
  currentState: "Telangana",
  currentCity: "Hyderabad",
  currentAddress: "Road 1",
  areaOfExpertise: "Music",
  yearOfExperience: 4,
  highestQualification: "Bachelor's",
  currentCTC: "1",
  expectedCTC: "2",
  noticePeriod: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  availability: "Flexible",
  mode: "offline",
  reportsTo: world.bde.user._id,
  branchIds: [world.banjara._id],
  ...overrides,
});

test("creating an instructor records their manager and adds them to their branches", async () => {
  const res = await request(app, "POST", "/api/v1/teachers", { token: world.ceo.token, body: instructorBody() });

  assert.equal(res.status, 201);
  const user = await User.findById(res.body.data.userId).lean();
  assert.equal(String(user.org.reportsTo), String(world.bde.user._id));
  const branch = await Branch.findById(world.banjara._id).lean();
  assert.ok(branch.teachers.map(String).includes(String(res.body.data.id)));
});

test("an online instructor can't be given a branch, and nothing is created", async () => {
  const body = instructorBody({ mode: "online" });
  const res = await request(app, "POST", "/api/v1/teachers", { token: world.ceo.token, body });

  assert.equal(res.status, 400);
  assert.equal(await User.countDocuments({ email: body.email }), 0);
});

test("hiring an applicant records their manager and branches", async () => {
  const application = await TeacherApplication.create({
    name: { firstName: "Meera", lastName: "Dance" },
    gender: "female",
    language: { read: ["English"], speak: ["English"] },
    email: "meera@test.com",
    source: "admin",
    mobileNo: 9876501234,
    currentState: "Telangana",
    currentCity: "Hyderabad",
    currentAddress: "Road 2",
    areaOfExpertise: "Dance",
    yearOfExperience: 3,
    highestQualification: "Diploma",
    currentCTC: "1",
    expectedCTC: "2",
    noticePeriod: "2026-10-01",
    availability: "Flexible",
    mode: "hybrid",
  });

  const res = await request(app, "PUT", `/api/v1/teacherApplication/updateStatus/${application._id}/status`, {
    token: world.ceo.token,
    body: { status: "selected", employeePrefix: "DSMI", reportsTo: world.bde.user._id, branchIds: [world.nagaram._id] },
  });

  assert.equal(res.status, 200);
  assert.ok(res.body.credentials?.password);
  const user = await User.findOne({ email: "meera@test.com" }).lean();
  assert.equal(String(user.org.reportsTo), String(world.bde.user._id));
  const teacher = await Teacher.findOne({ userId: user._id }).lean();
  const branch = await Branch.findById(world.nagaram._id).lean();
  assert.ok(branch.teachers.map(String).includes(String(teacher._id)));
});

test("an instructor keeps a branch while they still teach learners there", async () => {
  const created = await request(app, "POST", "/api/v1/teachers", { token: world.ceo.token, body: instructorBody() });
  const teacherId = created.body.data.id;
  const userId = created.body.data.userId;
  await ClassRoster.create({
    teacherId,
    courseId: world.offlinePiano._id,
    parentAvailabilityId: new mongoose.Types.ObjectId(),
    branchId: world.banjara._id,
    sessionType: "standard",
    startTime: "10:00",
    endTime: "11:00",
    students: [{ studentId: new mongoose.Types.ObjectId(), status: "active" }],
  });

  const blocked = await request(app, "PATCH", `/api/v1/user/${userId}/org`, {
    token: world.ceo.token,
    body: { org: { reportsTo: world.bde.user._id }, branchIds: [world.nagaram._id] },
  });
  assert.equal(blocked.status, 409);
  assert.ok((await Branch.findById(world.banjara._id).lean()).teachers.map(String).includes(String(teacherId)));

  await ClassRoster.deleteMany({});
  const moved = await request(app, "PATCH", `/api/v1/user/${userId}/org`, {
    token: world.ceo.token,
    body: { org: { reportsTo: world.bde.user._id }, branchIds: [world.nagaram._id] },
  });
  assert.equal(moved.status, 200);
  assert.ok(!(await Branch.findById(world.banjara._id).lean()).teachers.map(String).includes(String(teacherId)));
  assert.ok((await Branch.findById(world.nagaram._id).lean()).teachers.map(String).includes(String(teacherId)));
});

// --- Zones ------------------------------------------------------------------

test("zones are unique per city and can't be deleted while in use", async () => {
  const duplicate = await request(app, "POST", "/api/v1/zone", {
    token: world.ceo.token,
    body: { name: "South", city: world.hyderabad._id },
  });
  assert.equal(duplicate.status, 409);

  const inUse = await request(app, "DELETE", `/api/v1/zone/${world.south._id}`, { token: world.ceo.token });
  assert.equal(inUse.status, 409);

  const spare = await Zone.create({ name: "North", city: world.hyderabad._id });
  const removed = await request(app, "DELETE", `/api/v1/zone/${spare._id}`, { token: world.ceo.token });
  assert.equal(removed.status, 200);
});

test("a branch's zone must be in the branch's own city", async () => {
  const body = {
    branchName: "Gachibowli",
    location: "Road 3",
    branchManager: world.bde.user._id,
    branchAdminEmail: "g@x.com",
    branchAdminContact: "9999999999",
    city: world.hyderabad._id,
    zone: world.west._id,
    status: "active",
    branchTimings: ["09:00", "20:00"],
    branchOpenDays: ["monday"],
    branchCapacity: 20,
  };

  const wrongCity = await request(app, "POST", "/api/v1/branch/create", { token: world.ceo.token, body });
  assert.equal(wrongCity.status, 400);
  assert.match(wrongCity.body.message, /different city/);

  const ok = await request(app, "POST", "/api/v1/branch/create", {
    token: world.ceo.token,
    body: { ...body, zone: world.south._id },
  });
  assert.equal(ok.status, 201);
});

test("public branch reads carry the zone's name", async () => {
  const res = await request(app, "GET", `/api/v1/branch/${world.banjara._id}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.branch.zone.name, "South");
});

test("a city with zones or branches can't be deleted", async () => {
  const res = await request(app, "DELETE", `/api/v1/city/${world.pune._id}`, { token: world.ceo.token });

  assert.equal(res.status, 409);
  assert.ok(await City.exists({ _id: world.pune._id }));
});

// --- HR details -----------------------------------------------------------

test("HR details come back only from GET /admin/:id and the admin's own profile", async () => {
  const created = await request(app, "POST", "/api/v1/admin/create", {
    token: world.ceo.token,
    body: aaBody({
      dateOfBirth: "1990-05-20",
      emergencyContact: { name: "Ravi", relation: "Brother", phone: "9876543210" },
      address: "Road 1, Hyderabad",
    }),
  });
  assert.equal(created.status, 200);
  const adminId = created.body.admin._id;
  const user = await User.findById(created.body.user._id).lean();
  const ownToken = tokenFor(user, adminId);

  const detail = await request(app, "GET", `/api/v1/admin/${adminId}`, { token: world.ceo.token });
  assert.equal(detail.body.admin.address, "Road 1, Hyderabad");
  assert.equal(detail.body.admin.emergencyContact.phone, "9876543210");

  const list = await request(app, "GET", "/api/v1/admin/get-all-admin", { token: world.ceo.token });
  const listed = list.body.admins.find((admin) => admin._id === adminId);
  assert.ok(listed.dateOfJoining, "cards show the joining date");
  assert.equal(listed.dateOfBirth, undefined);
  assert.equal(listed.emergencyContact, undefined);
  assert.equal(listed.address, undefined);

  const byColleague = await request(app, "GET", `/api/v1/user/${user._id}`, { token: world.ceo.token });
  assert.equal(byColleague.body.user.adminDetails.address, undefined);

  const own = await request(app, "GET", `/api/v1/user/${user._id}`, { token: ownToken });
  assert.equal(own.body.user.adminDetails.address, "Road 1, Hyderabad");

  const session = await request(app, "GET", "/api/v1/user/me", { token: ownToken });
  assert.equal(session.status, 200);
  assert.equal(session.body.user.adminDetails.address, undefined, "never in the session");
  assert.equal(session.body.user.designation, "aa");
});
