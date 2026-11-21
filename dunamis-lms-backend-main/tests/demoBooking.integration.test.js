"use strict";

// Integration tests for the public Book Demo endpoint and its funnel pings.
//
// The router is mounted on a throwaway express app so optionalAuth and the
// validators run exactly as they do in production.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.MAIL_HOST = "";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

const mailSenderPath = require.resolve("../utils/mailSender");
require.cache[mailSenderPath] = {
  id: mailSenderPath,
  filename: mailSenderPath,
  loaded: true,
  exports: async (to) => ({ accepted: [to] }),
};

const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Category = require("../model/category.model");
const Course = require("../model/course.model");
const DemoBooking = require("../model/demoBooking.model");
const DemoFunnelEvent = require("../model/demoFunnelEvent.model");
const Slot = require("../model/slot.model");
const Teacher = require("../model/teacher.model");
const User = require("../model/user.model");
const demoBookingRoutes = require("../routes/demoBooking.route");

const oid = () => new mongoose.Types.ObjectId();
let seq = 0;
let server;
let baseUrl;

const waitFor = async (check, timeoutMs = 3000) => {
  const deadline = Date.now() + timeoutMs;
  while (!(await check())) {
    if (Date.now() > deadline) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
};

const post = async (path, body, headers = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
};

async function scenario() {
  seq += 1;
  const user = await User.create({
    name: { firstName: "Meera", lastName: "Test" },
    password: "x",
    mobileNo: 9100000000 + seq,
    email: `meera${seq}@test.com`,
    accountType: "teacher",
  });
  const teacher = await Teacher.create({ userId: user._id, teacherDetail: oid() });
  const category = await Category.create({ name: `Music ${seq}` });
  const course = await Course.create({
    name: `Guitar ${seq}`,
    code: `G${seq}`,
    description: "d",
    category: category._id,
    subCategory: [oid()],
    mode: "online",
    teacher: [teacher._id],
  });
  const date = new Date(Date.now() + 3 * 24 * 3600000);
  date.setHours(0, 0, 0, 0);
  const slot = await Slot.create({
    courseId: course._id,
    date,
    startTime: "17:00",
    endTime: "17:20",
    createdBy: teacher._id,
    slotType: "demo",
    sessionType: "standard",
  });
  return { teacher, course, slot };
}

const bookingBody = ({ course, slot, teacher }, overrides = {}) => ({
  courseId: String(course._id),
  slotId: String(slot._id),
  teacherId: String(teacher._id),
  deliveryMode: "online",
  lead: { firstName: "Priya", phone: "+919876543210", email: "priya@test.com" },
  ...overrides,
});

before(async () => {
  await startMemoryMongo();
  await Promise.all([DemoBooking.init(), DemoFunnelEvent.init()]);
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/demoBookings", demoBookingRoutes);
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await stopMemoryMongo();
});
beforeEach(async () => {
  await clearCollections();
});

test("a guest with a single name can book a demo", async () => {
  const setup = await scenario();
  const res = await post("/demoBookings", bookingBody(setup));

  assert.equal(res.status, 201);
  const booking = await DemoBooking.findOne({ slotId: setup.slot._id }).lean();
  assert.equal(booking.lead.firstName, "Priya");
  assert.equal(booking.lead.lastName, "");
  assert.equal(booking.studentId, null);
});

test("a guest booking with an unusable phone number is refused", async () => {
  const setup = await scenario();
  const res = await post(
    "/demoBookings",
    bookingBody(setup, { lead: { firstName: "Priya", phone: "12345", email: "priya@test.com" } })
  );

  assert.equal(res.status, 400);
  assert.match(res.body.message, /mobile number/);
  assert.equal(await DemoBooking.countDocuments(), 0);
});

test("an expired login cookie books as a guest instead of failing", async () => {
  const setup = await scenario();
  const expired = jwt.sign(
    { userId: String(oid()), accountType: "student" },
    process.env.JWT_SECRET,
    { expiresIn: -10 }
  );
  const res = await post("/demoBookings", bookingBody(setup), {
    cookie: `token=${expired}`,
  });

  assert.equal(res.status, 201);
  assert.equal(await DemoBooking.countDocuments({ "lead.email": "priya@test.com" }), 1);
});

test("a slot someone else just took answers 409", async () => {
  const setup = await scenario();
  assert.equal((await post("/demoBookings", bookingBody(setup))).status, 201);

  const res = await post(
    "/demoBookings",
    bookingBody(setup, {
      lead: { firstName: "Ravi", lastName: "K", phone: "9876500000", email: "ravi@test.com" },
    })
  );

  assert.equal(res.status, 409);
  assert.match(res.body.message, /already booked/);
});

test("a booking records a booked funnel event with its source", async () => {
  const setup = await scenario();
  const flowId = crypto.randomUUID();
  const res = await post("/demoBookings", bookingBody(setup, { flowId, source: "hero" }));

  assert.equal(res.status, 201);
  await waitFor(async () => (await DemoFunnelEvent.countDocuments({ flowId })) > 0);
  const event = await DemoFunnelEvent.findOne({ flowId }).lean();
  assert.equal(event.event, "booked");
  assert.equal(event.source, "hero");
  assert.equal(String(event.courseId), String(setup.course._id));
  assert.equal(event.deliveryMode, "online");
});

test("a malformed flowId never blocks the booking", async () => {
  const setup = await scenario();
  const res = await post(
    "/demoBookings",
    bookingBody(setup, { flowId: "not-a-uuid", source: "somewhere" })
  );

  assert.equal(res.status, 201);
  assert.equal(await DemoFunnelEvent.countDocuments(), 0);
});

test("the same funnel step reported twice is stored once", async () => {
  const flowId = crypto.randomUUID();
  const body = {
    flowId,
    event: "opened",
    courseId: String(oid()),
    source: "course_page",
    loggedIn: false,
    hasSlots: false,
  };

  assert.equal((await post("/demoBookings/funnel", body)).status, 204);
  assert.equal((await post("/demoBookings/funnel", body)).status, 204);

  const events = await DemoFunnelEvent.find({ flowId }).lean();
  assert.equal(events.length, 1);
  assert.equal(events[0].hasSlots, false);
});

test("the browser cannot report a booked event", async () => {
  const res = await post("/demoBookings/funnel", {
    flowId: crypto.randomUUID(),
    event: "booked",
    courseId: String(oid()),
    source: "course_page",
  });

  assert.equal(res.status, 400);
  assert.equal(await DemoFunnelEvent.countDocuments(), 0);
});

test("monthly insights count each Book Demo step and courses with no demo times", async () => {
  const { buildMonthlyInsights } = require("../controller/insights.controller");
  const { course } = await scenario();
  const courseId = String(course._id);
  const send = (flowId, event, extra = {}) =>
    post("/demoBookings/funnel", { flowId, event, courseId, source: "hero", ...extra });

  const finished = crypto.randomUUID();
  await send(finished, "opened", { hasSlots: true });
  await send(finished, "slot_chosen");
  await send(finished, "submitted");
  await DemoFunnelEvent.create({ flowId: finished, event: "booked", courseId, source: "hero" });

  await send(crypto.randomUUID(), "opened", { hasSlots: false });

  const insights = await buildMonthlyInsights({});
  const flow = insights.funnel.bookingFlow;
  assert.deepEqual(
    flow.steps.map((step) => [step.key, step.value]),
    [
      ["opened", 2],
      ["slot_chosen", 1],
      ["submitted", 1],
      ["booked", 1],
    ]
  );
  assert.equal(flow.completionRate, 50);
  assert.deepEqual(flow.bySource, [{ source: "hero", opened: 2, booked: 1, rate: 50 }]);
  assert.equal(flow.noSlotCourses.length, 1);
  assert.equal(flow.noSlotCourses[0].name, course.name);
});

test("a scoped viewer does not get the Book Demo steps", async () => {
  const { buildMonthlyInsights } = require("../controller/insights.controller");
  const insights = await buildMonthlyInsights({ area: { branchIds: [], courseIds: [] } });

  assert.equal(insights.funnel.bookingFlow, null);
  assert.ok(insights.hiddenSections.includes("demoFlow"));
});
