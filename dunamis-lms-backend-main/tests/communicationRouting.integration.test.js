"use strict";

// Integration tests for communication routing: who is "the AA" and "the BDE"
// for a message (scope + escalation), and what notifyEvent sends to whom on
// which channel.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

// Capture outbound email before anything requires the real sender.
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

const User = require("../model/user.model");
const Branch = require("../model/branch.model");
const Zone = require("../model/zone.model");
const City = require("../model/city.model");
const Course = require("../model/course.model");
const AdminNotice = require("../model/adminNotice.model");
const { loadRoutingDirectory, resolveStaff } = require("../services/staffRouting");
const { notifyEvent } = require("../utils/notificationService");

const oid = () => new mongoose.Types.ObjectId();
let seq = 0;
let world;

const makeUser = ({ org, accountType = "admin", accountStatus = "active", name = "Staff" } = {}) => {
  seq += 1;
  return User.create({
    name: { firstName: name, lastName: `No${seq}` },
    email: `${name.toLowerCase().replace(/\s+/g, "")}${seq}@test.com`,
    mobileNo: 9000000000 + seq,
    password: "x",
    accountType,
    accountStatus,
    org,
  });
};

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
  });
  const [banjara, nagaram, koregaon] = await Branch.create([
    branch("Banjara", hyderabad._id, south._id),
    branch("Nagaram", hyderabad._id, south._id),
    branch("Koregaon", pune._id, west._id),
  ]);
  const guitar = oid();
  const music = oid();
  const onlineGuitar = await Course.create({
    name: "Online Guitar",
    code: "OG-1",
    category: music,
    subCategory: [guitar],
    mode: "online",
  });

  const head = await makeUser({ name: "Head", org: { designation: "marketingHead" } });
  const bdm = await makeUser({ name: "Bdm", org: { designation: "bdm", workMode: "offline", cities: [hyderabad._id] } });
  const bde = await makeUser({ name: "Bde", org: { designation: "bde", workMode: "offline", zones: [south._id] } });
  const aa = await makeUser({ name: "Aa", org: { designation: "aa", workMode: "offline", branches: [banjara._id] } });
  const onlineAa = await makeUser({
    name: "OnlineAa",
    org: { designation: "aa", workMode: "online", courses: [onlineGuitar._id] },
  });
  // Covers Nagaram, but disabled accounts never receive anything.
  const inactiveAa = await makeUser({
    name: "InactiveAa",
    accountStatus: "inactive",
    org: { designation: "aa", workMode: "offline", branches: [nagaram._id] },
  });
  const unplaced = await makeUser({ name: "Unplaced" });
  const instructor = await makeUser({ name: "Teacher", accountType: "teacher" });
  const learner = await makeUser({ name: "Learner", accountType: "student" });

  return { banjara, nagaram, koregaon, onlineGuitar, head, bdm, bde, aa, onlineAa, inactiveAa, unplaced, instructor, learner };
}

const ids = (people) => people.map((person) => String(person._id)).sort();
const route = async (columns, context) =>
  resolveStaff({ columns, context, directory: await loadRoutingDirectory() });

before(async () => {
  await startMemoryMongo();
});
after(async () => {
  await stopMemoryMongo();
});
beforeEach(async () => {
  await clearCollections();
  mails = [];
  world = await buildWorld();
});

// --- Who is the AA / BDE ------------------------------------------------------

test("an offline message goes to the branch's AA and the BDE over its zone", async () => {
  const { recipients, fellBack } = await route({ aa: true, bde: true }, { branchId: world.banjara._id });

  assert.deepEqual(ids(recipients), ids([world.aa, world.bde]));
  assert.equal(fellBack, false);
});

test("with no active AA on the branch, the AA copy climbs to the BDE", async () => {
  const { recipients } = await route({ aa: true, bde: false }, { branchId: world.nagaram._id });

  assert.deepEqual(ids(recipients), ids([world.bde]), "the disabled AA over Nagaram is skipped");
});

test("a branch outside every BDE's zone and BDM's city climbs to the Marketing Head", async () => {
  const { recipients } = await route({ aa: true, bde: true }, { branchId: world.koregaon._id });

  assert.deepEqual(ids(recipients), ids([world.head]));
});

test("an online message ignores offline-only scopes", async () => {
  const { recipients } = await route({ aa: true, bde: true }, { courseId: world.onlineGuitar._id });

  // The online AA covers the course; nobody online sits at BDE or BDM level,
  // so the BDE copy climbs to the Marketing Head.
  assert.deepEqual(ids(recipients), ids([world.onlineAa, world.head]));
});

test("a message with no location goes to every active holder of the role", async () => {
  const { recipients } = await route({ aa: true, bde: true }, {});

  assert.deepEqual(ids(recipients), ids([world.aa, world.onlineAa, world.bde]));
});

test("with nobody placed at all, it falls back to every active admin", async () => {
  await User.updateMany({ accountType: "admin" }, { $unset: { org: "" } });

  const { recipients, fellBack } = await route({ aa: true, bde: true }, { branchId: world.banjara._id });

  assert.equal(fellBack, true);
  assert.equal(recipients.length, 6, "every active admin");
  assert.ok(!ids(recipients).includes(String(world.inactiveAa._id)));
});

// --- What notifyEvent sends ---------------------------------------------------

test("an email row sends email only, to learner, instructor and scoped staff", async () => {
  await notifyEvent({
    event: "demoBooked",
    context: { branchId: world.banjara._id },
    instructorUser: world.instructor,
    title: "New demo booking",
    message: "A demo was booked.",
    learners: [world.learner],
    learnerTitle: "Demo booked",
    learnerMessage: "Your demo is booked.",
  });

  assert.deepEqual(
    mails.map((mail) => mail.to).sort(),
    [world.aa.email, world.bde.email, world.instructor.email, world.learner.email].sort()
  );
  assert.equal(await AdminNotice.countDocuments(), 0);
  assert.match(mails.find((mail) => mail.to === world.learner.email).html, /Your demo is booked\./);
});

test("a notification row writes notices only", async () => {
  await notifyEvent({
    event: "signUp",
    title: "New student registration",
    message: "Someone signed up.",
    learners: [world.learner],
    learnerTitle: "Welcome to Dunamis India",
    learnerMessage: "Your account is ready.",
  });

  assert.equal(mails.length, 0);
  const staffNotice = await AdminNotice.findOne({ title: "New student registration" }).lean();
  assert.deepEqual(staffNotice.specificUsers.map(String).sort(), ids([world.aa, world.onlineAa, world.bde]));
  const welcome = await AdminNotice.findOne({ title: "Welcome to Dunamis India" }).lean();
  assert.deepEqual(welcome.specificUsers.map(String), [String(world.learner._id)]);
});

test("a call with only learner content reaches learners only", async () => {
  await notifyEvent({
    event: "assignmentCycle",
    learners: [world.learner],
    learnerTitle: "New assignment posted",
    learnerMessage: "You have a new assignment.",
  });

  const notices = await AdminNotice.find().lean();
  assert.equal(notices.length, 1);
  assert.deepEqual(notices[0].specificUsers.map(String), [String(world.learner._id)]);
});

test("an unticked audience is skipped even when content is supplied", async () => {
  await notifyEvent({
    event: "feeReceived",
    context: { branchId: world.banjara._id },
    instructorUser: world.instructor,
    title: "Installment received",
    message: "Paid.",
    learners: [world.learner],
    learnerTitle: "Payment received",
    learnerMessage: "Thanks.",
  });

  const notices = await AdminNotice.find().lean();
  assert.equal(notices.length, 1, "staff only: learner and instructor are unticked for fee received");
  assert.deepEqual(notices[0].specificUsers.map(String).sort(), ids([world.aa, world.bde]));
});

test("the instructor falls back to the shared content, and unknown events do nothing", async () => {
  await notifyEvent({
    event: "missedAttendance",
    context: { branchId: world.banjara._id },
    instructorUser: world.instructor,
    title: "Attendance & homework not marked",
    message: "Not marked.",
  });
  await notifyEvent({ event: "noSuchEvent", title: "x", message: "y", learners: [world.learner], learnerTitle: "z" });

  const notices = await AdminNotice.find({ title: "Attendance & homework not marked" }).lean();
  const recipientsOf = (notice) => notice.specificUsers.map(String).sort();
  assert.deepEqual(notices.map(recipientsOf).sort(), [ids([world.aa, world.bde]), ids([world.instructor])].sort());
  assert.equal(await AdminNotice.countDocuments(), 2);
});
