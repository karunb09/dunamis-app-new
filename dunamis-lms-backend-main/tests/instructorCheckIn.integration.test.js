"use strict";

// Integration tests for offline instructor branch check-in / check-out.
//
// What matters here is what pay will later be worked out from: the time is the
// server's, lateness is exact to the second, a record is linked to the classes
// the instructor was actually there for, and nothing an instructor does after
// submitting can change it.
//
// Imported from services/, never from cronJobs/ — requiring the .cron.js
// registers a node-cron timer and the test runner never exits.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.MAIL_HOST = "";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

const mongoose = require("mongoose");
const Branch = require("../model/branch.model");
const ClassRoster = require("../model/classRoster.model");
const Course = require("../model/course.model");
const DemoBooking = require("../model/demoBooking.model");
const InstructorCheckIn = require("../model/instructorCheckIn.model");
const Slot = require("../model/slot.model");
const Teacher = require("../model/teacher.model");
const User = require("../model/user.model");
const notificationService = require("../utils/notificationService");
const {
  addAdminNote,
  buildCheckInReport,
  checkIn,
  checkOut,
  evaluateGeofence,
  getTeacherHistory,
  getTeacherToday,
} = require("../services/instructorCheckIn");
const { sendCheckInReminders } = require("../services/checkInReminder");
const { haversineMeters } = require("../utils/geo");
const { istDayStart } = require("../utils/istMonth");

const oid = () => new mongoose.Types.ObjectId();

const DAY = "2026-09-15";
const NEXT_DAY = "2026-09-16";

// An IST wall-clock instant on DAY, to the second.
const at = (hhmm, { seconds = 0, day = DAY } = {}) => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(istDayStart(day).getTime() + ((h * 60 + m) * 60 + seconds) * 1000);
};

// Slot.date is written at the server's local midnight (syncAvailabilitySlots).
const slotDate = (day = DAY) => {
  const [y, mo, d] = day.split("-").map(Number);
  return new Date(y, mo - 1, d);
};

const PIN = { lat: 17.4156, lng: 78.4347 };
// 0.00001° of latitude is ~1.11 m.
const near = { lat: PIN.lat + 0.00045, lng: PIN.lng, accuracyM: 20 }; // ~50 m
const across = { lat: PIN.lat + 0.00575, lng: PIN.lng, accuracyM: 20 }; // ~640 m
const faraway = { lat: PIN.lat + 0.0288, lng: PIN.lng, accuracyM: 20 }; // ~3.2 km

let seq = 0;
let sent = [];
const realNotifyEvent = notificationService.notifyEvent;

async function makeTeacher(firstName = "Meera") {
  const user = await User.create({
    name: { firstName, lastName: "Rao" },
    password: "x",
    mobileNo: 9000000000 + seq++,
    email: `t${seq}@test.com`,
    accountType: "teacher",
  });
  return Teacher.create({ userId: user._id, teacherDetail: oid() });
}

async function makeBranch({ pinned = true, teachers = [], radius } = {}) {
  seq += 1;
  return Branch.create({
    branchName: `Branch ${seq}`,
    location: "Road No. 1",
    branchManager: oid(),
    branchAdminEmail: "branch@test.com",
    branchAdminContact: "9999999999",
    zone: oid(),
    city: oid(),
    branchTimings: ["09:00", "20:00"],
    branchOpenDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
    branchCapacity: 20,
    status: "active",
    teachers: teachers.map((t) => t._id),
    ...(pinned ? { geo: { ...PIN } } : {}),
    ...(radius ? { geofenceRadiusM: radius } : {}),
  });
}

async function makeCourse() {
  return Course.create({
    name: `Guitar ${seq++}`,
    code: `G${seq}`,
    description: "d",
    category: oid(),
    subCategory: [oid()],
  });
}

async function makeClass({
  teacher,
  branch,
  course,
  start = "16:00",
  end = "17:00",
  day = DAY,
  slotType = "enrolled",
  students = [oid()],
}) {
  return Slot.create({
    courseId: course._id,
    branchId: branch._id,
    date: slotDate(day),
    startTime: start,
    endTime: end,
    createdBy: teacher._id,
    slotType,
    sessionType: "standard",
    students,
  });
}

// One instructor, one pinned branch they're assigned to, one course.
async function setup() {
  const teacher = await makeTeacher();
  const branch = await makeBranch({ teachers: [teacher] });
  const course = await makeCourse();
  return { teacher, branch, course };
}

const rejectsWith = (promise, statusCode, pattern) =>
  assert.rejects(promise, (err) => {
    assert.equal(err.statusCode, statusCode, err.message);
    if (pattern) assert.match(err.message, pattern);
    return true;
  });

before(async () => {
  await startMemoryMongo();
  await InstructorCheckIn.init();
  notificationService.notifyEvent = async (payload) => {
    sent.push(payload);
  };
});
after(async () => {
  notificationService.notifyEvent = realNotifyEvent;
  await stopMemoryMongo();
});
beforeEach(async () => {
  await clearCollections();
  sent = [];
});

// ── Geofence ──────────────────────────────────────────────────────────────

test("haversine: one degree of latitude is ~111 km", () => {
  const d = haversineMeters({ lat: 17, lng: 78 }, { lat: 18, lng: 78 });
  assert.ok(Math.abs(d - 111195) < 50, `got ${d}`);
});

test("geofence gives a reading's accuracy the benefit of the doubt, capped at 100 m", () => {
  const branch = { geo: PIN, geofenceRadiusM: 200 };
  const north = (metres) => PIN.lat + metres / 111195;

  assert.equal(evaluateGeofence(branch, { lat: north(280), lng: PIN.lng, accuracyM: 90 }).withinRadius, true);
  assert.equal(evaluateGeofence(branch, { lat: north(350), lng: PIN.lng, accuracyM: 300 }).withinRadius, false);
  assert.equal(evaluateGeofence({}, { ...near }).withinRadius, null, "no pin, nothing to measure");
  assert.equal(
    evaluateGeofence({ geo: PIN }, { lat: north(190), lng: PIN.lng, accuracyM: 5 }).radiusM,
    200,
    "a branch saved before check-in existed falls back to the default radius"
  );
});

// ── Check-in ─────────────────────────────────────────────────────────────

test("check-in inside the radius is accepted, stamped with server time and linked to the class", async () => {
  const { teacher, branch, course } = await setup();
  const slot = await makeClass({ teacher, branch, course });

  const visit = await checkIn({
    teacherId: teacher._id,
    branchId: branch._id,
    fix: { ...near, deviceTime: new Date("2020-01-01") },
    now: at("15:50"),
  });

  assert.equal(visit.status, "open");
  assert.equal(visit.dayKey, DAY);
  assert.equal(visit.checkIn.at.getTime(), at("15:50").getTime(), "server time, never the device's");
  assert.equal(visit.checkIn.withinRadius, true);
  assert.ok(visit.checkIn.distanceM > 30 && visit.checkIn.distanceM < 70);
  assert.deepEqual(visit.classes.map((c) => String(c.slotId)), [String(slot._id)]);
  assert.equal(visit.flags.lateCheckIn, false);
  assert.equal(visit.expectedCheckOutAt.getTime(), at("17:00").getTime());
});

test("check-in outside the radius is refused with the distance", async () => {
  const { teacher, branch, course } = await setup();
  await makeClass({ teacher, branch, course });

  await assert.rejects(
    checkIn({ teacherId: teacher._id, branchId: branch._id, fix: across, now: at("15:50") }),
    (err) => {
      assert.equal(err.statusCode, 422);
      assert.match(err.message, /^You are 6\d\d m from Branch/);
      assert.equal(err.details.radiusM, 200);
      return true;
    }
  );
  assert.equal(await InstructorCheckIn.countDocuments(), 0);
});

test("a weak GPS fix is refused", async () => {
  const { teacher, branch, course } = await setup();
  await makeClass({ teacher, branch, course });

  await rejectsWith(
    checkIn({ teacherId: teacher._id, branchId: branch._id, fix: { ...near, accuracyM: 900 }, now: at("15:50") }),
    422,
    /too imprecise/
  );
});

test("a branch without a pin accepts the check-in but flags it unverified", async () => {
  const teacher = await makeTeacher();
  const branch = await makeBranch({ pinned: false, teachers: [teacher] });
  const course = await makeCourse();
  await makeClass({ teacher, branch, course });

  const visit = await checkIn({ teacherId: teacher._id, branchId: branch._id, fix: faraway, now: at("15:50") });

  assert.equal(visit.checkIn.withinRadius, null);
  assert.equal(visit.checkIn.distanceM, null);
  assert.equal(visit.flags.locationUnverified, true);
});

test("an instructor not assigned to the branch is refused", async () => {
  const teacher = await makeTeacher();
  const branch = await makeBranch({ teachers: [] });

  await rejectsWith(
    checkIn({ teacherId: teacher._id, branchId: branch._id, fix: near, now: at("15:50") }),
    403,
    /not assigned/
  );
});

test("availability at the branch counts as assignment even without a class today", async () => {
  const teacher = await makeTeacher();
  const branch = await makeBranch({ teachers: [] });
  await Teacher.updateOne(
    { _id: teacher._id },
    {
      $push: {
        weeklyAvailability: {
          days: ["monday", "thursday"],
          startTime: "16:00",
          endTime: "17:00",
          sessionType: "standard",
          slotType: "enrolled",
          branchId: branch._id,
        },
      },
    }
  );

  const visit = await checkIn({ teacherId: teacher._id, branchId: branch._id, fix: near, now: at("15:50") });

  assert.equal(visit.flags.noScheduledClass, true);
  assert.equal(visit.expectedCheckOutAt.getTime(), at("20:00").getTime(), "branch closing time stands in");
});

test("one second after the class starts is late; exactly on time is not", async () => {
  const { teacher, branch, course } = await setup();
  await makeClass({ teacher, branch, course });

  const onTime = await checkIn({ teacherId: teacher._id, branchId: branch._id, fix: near, now: at("16:00") });
  assert.equal(onTime.flags.lateCheckIn, false);
  await InstructorCheckIn.deleteMany({});

  const late = await checkIn({
    teacherId: teacher._id,
    branchId: branch._id,
    fix: near,
    now: at("16:00", { seconds: 1 }),
  });
  assert.equal(late.flags.lateCheckIn, true);
  assert.equal(late.flags.lateByMinutes, 1);
});

test("empty generated slots are not classes; the roster rescues an empty enrolled slot; demos need a booking", async () => {
  const { teacher, branch, course } = await setup();
  const parentAvailabilityId = oid();
  await makeClass({ teacher, branch, course, start: "10:00", end: "11:00", students: [] });
  const rescued = await Slot.create({
    courseId: course._id,
    branchId: branch._id,
    date: slotDate(),
    startTime: "12:00",
    endTime: "13:00",
    createdBy: teacher._id,
    slotType: "enrolled",
    sessionType: "standard",
    parentAvailabilityId,
    students: [],
  });
  await ClassRoster.create({
    teacherId: teacher._id,
    courseId: course._id,
    parentAvailabilityId,
    branchId: branch._id,
    sessionType: "standard",
    startTime: "12:00",
    endTime: "13:00",
    students: [{ studentId: oid(), status: "active" }],
  });
  const unbooked = await makeClass({ teacher, branch, course, start: "14:00", end: "14:20", slotType: "demo", students: [] });
  const booked = await makeClass({ teacher, branch, course, start: "15:00", end: "15:20", slotType: "demo", students: [] });
  await DemoBooking.create({ slotId: booked._id, categoryId: oid(), courseId: course._id, teacherId: teacher._id, branchId: branch._id });
  await DemoBooking.create({
    slotId: unbooked._id,
    categoryId: oid(),
    courseId: course._id,
    teacherId: teacher._id,
    demoStatus: "Cancelled",
  });

  const visit = await checkIn({ teacherId: teacher._id, branchId: branch._id, fix: near, now: at("09:50") });

  assert.deepEqual(
    visit.classes.map((c) => String(c.slotId)),
    [String(rescued._id), String(booked._id)]
  );
});

// ── Several visits in a day ──────────────────────────────────────────────

test("two visits to one branch split the day's classes between them", async () => {
  const { teacher, branch, course } = await setup();
  const morning = await makeClass({ teacher, branch, course, start: "10:00", end: "11:00" });
  const evening = await makeClass({ teacher, branch, course, start: "18:00", end: "19:00" });

  const first = await checkIn({ teacherId: teacher._id, branchId: branch._id, fix: near, now: at("09:55") });
  assert.equal(first.classes.length, 2, "both are ahead at check-in");

  const out = await checkOut({ teacherId: teacher._id, visitId: first._id, fix: near, now: at("11:05") });
  assert.deepEqual(out.classes.map((c) => String(c.slotId)), [String(morning._id)], "unstarted class released");
  assert.equal(out.lastClassEndAt.getTime(), at("11:00").getTime());
  assert.equal(out.flags.earlyCheckOut, false);

  const second = await checkIn({ teacherId: teacher._id, branchId: branch._id, fix: near, now: at("17:55") });
  assert.deepEqual(second.classes.map((c) => String(c.slotId)), [String(evening._id)]);
});

test("a class that ended before check-in is reported as missed, not as hours of lateness", async () => {
  const { teacher, branch, course } = await setup();
  const missed = await makeClass({ teacher, branch, course, start: "10:00", end: "11:00" });
  const next = await makeClass({ teacher, branch, course, start: "12:00", end: "13:00" });

  const visit = await checkIn({ teacherId: teacher._id, branchId: branch._id, fix: near, now: at("11:30") });
  assert.deepEqual(visit.classes.map((c) => String(c.slotId)), [String(next._id)]);
  assert.equal(visit.flags.lateCheckIn, false);

  const report = await buildCheckInReport({ from: DAY, to: DAY, now: at("11:35") });
  assert.deepEqual(report.missedClasses.map((c) => String(c.slotId)), [String(missed._id)]);
  assert.equal(report.summary[0].classesMissed, 1);
});

test("checking in at another branch closes the open visit as unclosed and releases its unstarted classes", async () => {
  const teacher = await makeTeacher();
  const a = await makeBranch({ teachers: [teacher] });
  const b = await makeBranch({ teachers: [teacher] });
  const course = await makeCourse();
  await makeClass({ teacher, branch: a, course, start: "10:00", end: "11:00" });
  await makeClass({ teacher, branch: a, course, start: "18:00", end: "19:00" });
  await makeClass({ teacher, branch: b, course, start: "12:00", end: "13:00" });

  const atA = await checkIn({ teacherId: teacher._id, branchId: a._id, fix: near, now: at("09:55") });
  await checkIn({ teacherId: teacher._id, branchId: b._id, fix: near, now: at("11:50") });

  const closed = await InstructorCheckIn.findById(atA._id).lean();
  assert.equal(closed.status, "unclosed");
  assert.equal(closed.checkOut, null, "no check-out time is invented");
  assert.equal(closed.classes.length, 1, "the evening class goes back to the pool");

  await rejectsWith(
    checkOut({ teacherId: teacher._id, visitId: atA._id, fix: near, now: at("12:30") }),
    409,
    /another branch/
  );

  const report = await buildCheckInReport({ from: DAY, to: DAY, now: at("12:30") });
  const row = report.visits.find((v) => String(v._id) === String(atA._id));
  assert.equal(row.missingLogout, true);
});

test("checking in again at the same branch while checked in is refused", async () => {
  const { teacher, branch, course } = await setup();
  await makeClass({ teacher, branch, course });
  await checkIn({ teacherId: teacher._id, branchId: branch._id, fix: near, now: at("15:50") });

  await rejectsWith(
    checkIn({ teacherId: teacher._id, branchId: branch._id, fix: near, now: at("15:52") }),
    409,
    /already checked in/
  );
});

test("a double tap can't open two visits", async () => {
  const { teacher, branch, course } = await setup();
  await makeClass({ teacher, branch, course });

  const results = await Promise.allSettled([
    checkIn({ teacherId: teacher._id, branchId: branch._id, fix: near, now: at("15:50") }),
    checkIn({ teacherId: teacher._id, branchId: branch._id, fix: near, now: at("15:50") }),
  ]);

  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.find((r) => r.status === "rejected").reason.statusCode, 409);
  assert.equal(await InstructorCheckIn.countDocuments({ status: "open" }), 1);
});

// ── Check-out ────────────────────────────────────────────────────────────

test("leaving before the last class ends is an early logout, to the minute", async () => {
  const { teacher, branch, course } = await setup();
  await makeClass({ teacher, branch, course });
  const visit = await checkIn({ teacherId: teacher._id, branchId: branch._id, fix: near, now: at("15:50") });

  const out = await checkOut({ teacherId: teacher._id, visitId: visit._id, fix: near, now: at("16:45") });

  assert.equal(out.status, "closed");
  assert.equal(out.flags.earlyCheckOut, true);
  assert.equal(out.flags.earlyByMinutes, 15);
  assert.equal(out.flags.lateCheckOut, false);
});

test("an off-site check-out is refused until 30 minutes after the last class, then accepted as a late logout", async () => {
  const { teacher, branch, course } = await setup();
  await makeClass({ teacher, branch, course });
  const visit = await checkIn({ teacherId: teacher._id, branchId: branch._id, fix: near, now: at("15:50") });

  await rejectsWith(
    checkOut({ teacherId: teacher._id, visitId: visit._id, fix: faraway, now: at("17:29") }),
    422,
    /from anywhere/
  );

  const out = await checkOut({ teacherId: teacher._id, visitId: visit._id, fix: faraway, now: at("17:30") });
  assert.equal(out.flags.lateCheckOut, true);
  assert.equal(out.flags.earlyCheckOut, false);
  assert.equal(out.checkOut.offSite, true);
  assert.ok(out.checkOut.distanceM > 3000, "where they actually were is kept");
});

test("a submitted record can't be checked out again, by anyone else, or on a later day", async () => {
  const { teacher, branch, course } = await setup();
  const other = await makeTeacher("Ravi");
  await makeClass({ teacher, branch, course });
  const visit = await checkIn({ teacherId: teacher._id, branchId: branch._id, fix: near, now: at("15:50") });

  await rejectsWith(
    checkOut({ teacherId: other._id, visitId: visit._id, fix: near, now: at("17:05") }),
    404
  );
  await rejectsWith(
    checkOut({ teacherId: teacher._id, visitId: visit._id, fix: near, now: at("09:00", { day: NEXT_DAY }) }),
    409,
    /previous day/
  );

  const out = await checkOut({ teacherId: teacher._id, visitId: visit._id, fix: near, now: at("17:05") });
  await rejectsWith(
    checkOut({ teacherId: teacher._id, visitId: visit._id, fix: near, now: at("17:10") }),
    409,
    /already checked out/
  );

  const stored = await InstructorCheckIn.findById(visit._id).lean();
  assert.equal(stored.checkOut.at.getTime(), out.checkOut.at.getTime(), "the first check-out stands");
});

// ── Reminders ────────────────────────────────────────────────────────────

test("a class in progress with no check-in gets one reminder; a covered class gets none", async () => {
  const { teacher, branch, course } = await setup();
  const other = await makeTeacher("Ravi");
  const otherBranch = await makeBranch({ teachers: [other] });
  const uncovered = await makeClass({ teacher, branch, course });
  await makeClass({ teacher, branch, course, start: "16:00", end: "16:20", slotType: "demo", students: [] }).then(
    (demo) => DemoBooking.create({ slotId: demo._id, categoryId: oid(), courseId: course._id, teacherId: teacher._id })
  );
  await makeClass({ teacher: other, branch: otherBranch, course });
  await checkIn({ teacherId: other._id, branchId: otherBranch._id, fix: near, now: at("15:55") });

  await sendCheckInReminders(at("15:59"));
  assert.equal(sent.length, 0, "nothing before the class starts");

  await sendCheckInReminders(at("16:02"));
  assert.equal(sent.length, 1, "the demo and the group class go out as one email");
  assert.equal(sent[0].event, "instructorCheckIn");
  assert.match(sent[0].instructorSubject, /haven't checked in/);
  assert.equal(String(sent[0].context.branchId), String(branch._id), "scoped to the branch if staff are ever ticked");
  assert.ok((await Slot.findById(uncovered._id)).checkInReminderSentAt);

  await sendCheckInReminders(at("16:07"));
  assert.equal(sent.length, 1, "stamped, so the next tick stays quiet");
});

test("an open visit gets one check-out reminder 30 minutes after its last class", async () => {
  const { teacher, branch, course } = await setup();
  await makeClass({ teacher, branch, course });
  await checkIn({ teacherId: teacher._id, branchId: branch._id, fix: near, now: at("15:50") });

  await sendCheckInReminders(at("17:29"));
  assert.equal(sent.length, 0);

  await sendCheckInReminders(at("17:30"));
  assert.equal(sent.length, 1);
  assert.match(sent[0].instructorSubject, /haven't checked out/);

  await sendCheckInReminders(at("17:35"));
  assert.equal(sent.length, 1);
});

test("before anyone has checked in, nothing is missed and nobody is chased", async () => {
  const { teacher, branch, course } = await setup();
  await makeClass({ teacher, branch, course, start: "10:00", end: "11:00" });
  await makeClass({ teacher, branch, course });

  await sendCheckInReminders(at("16:02"));
  assert.equal(sent.length, 0, "deploying the feature must not email every offline instructor");

  const before = await buildCheckInReport({ from: DAY, to: DAY, now: at("16:05") });
  assert.equal(before.missedClasses.length, 0);
  assert.equal(before.liveSince, null);

  await checkIn({ teacherId: teacher._id, branchId: branch._id, fix: near, now: at("16:06") });
  const after = await buildCheckInReport({ from: DAY, to: DAY, now: at("16:10") });
  assert.equal(after.liveSince, DAY);
  assert.equal(after.missedClasses.length, 1, "from the first check-in on, an uncovered class counts");

  const history = await getTeacherHistory({ teacherId: teacher._id, month: "2026-09", now: at("09:00", { day: NEXT_DAY }) });
  assert.equal(history.totals.classesMissed, 1);
});

// ── Admin view ───────────────────────────────────────────────────────────

test("an admin correction sets the hours but never touches the instructor's record", async () => {
  const { teacher, branch, course } = await setup();
  await makeClass({ teacher, branch, course });
  const visit = await checkIn({ teacherId: teacher._id, branchId: branch._id, fix: near, now: at("15:50") });
  const adminUser = await User.create({
    name: { firstName: "Asha", lastName: "Admin" },
    password: "x",
    mobileNo: 9200000000 + seq++,
    email: `admin${seq}@test.com`,
    accountType: "admin",
  });

  await rejectsWith(
    addAdminNote({
      visitId: visit._id,
      userId: adminUser._id,
      note: "left at 5",
      correctedCheckOutAt: at("17:00"),
      now: at("17:40"),
    }),
    409,
    /still checked in/
  );

  const nextDay = at("10:00", { day: NEXT_DAY });
  const noted = await addAdminNote({
    visitId: visit._id,
    userId: adminUser._id,
    note: "Called — left at 5:05 pm",
    correctedCheckOutAt: at("17:05"),
    now: nextDay,
  });

  assert.equal(noted.checkOut, null, "the instructor's record is untouched");
  assert.equal(noted.missingLogout, true);
  assert.equal(noted.correctedCheckOutAt.getTime(), at("17:05").getTime());
  assert.equal(noted.minutesOnSite, 75);
  assert.equal(noted.adminNotes[0].by, "Asha Admin");
});

test("the report tallies late logins and early logouts per instructor for the range", async () => {
  const { teacher, branch, course } = await setup();
  await makeClass({ teacher, branch, course });
  await makeClass({ teacher, branch, course, day: NEXT_DAY });

  const first = await checkIn({ teacherId: teacher._id, branchId: branch._id, fix: near, now: at("16:03") });
  await checkOut({ teacherId: teacher._id, visitId: first._id, fix: near, now: at("16:50") });
  const nextDay = { day: NEXT_DAY };
  const second = await checkIn({ teacherId: teacher._id, branchId: branch._id, fix: near, now: at("16:10", nextDay) });
  await checkOut({ teacherId: teacher._id, visitId: second._id, fix: near, now: at("17:00", nextDay) });

  const report = await buildCheckInReport({ from: DAY, to: NEXT_DAY, now: at("20:00", nextDay) });

  assert.equal(report.summary.length, 1);
  const [row] = report.summary;
  assert.equal(row.visits, 2);
  assert.equal(row.lateCheckIns, 2);
  assert.equal(row.lateMinutes, 13);
  assert.equal(row.earlyCheckOuts, 1);
  assert.equal(row.earlyMinutes, 10);
  assert.equal(row.minutesOnSite, 47 + 50);
  assert.equal(report.unpinnedBranches.length, 0);

  await rejectsWith(buildCheckInReport({ from: NEXT_DAY, to: DAY }), 400);
});

test("the instructor's own views show today's classes by branch and the month's flags", async () => {
  const { teacher, branch, course } = await setup();
  const unpinned = await makeBranch({ pinned: false, teachers: [teacher] });
  const slot = await makeClass({ teacher, branch, course });
  const visit = await checkIn({ teacherId: teacher._id, branchId: branch._id, fix: near, now: at("16:04") });

  const today = await getTeacherToday({ teacherId: teacher._id, now: at("16:10") });
  assert.equal(today.branches[0]._id.toString(), branch._id.toString(), "branch with a class comes first");
  assert.equal(today.branches[0].classes[0].coveredBy, String(visit._id));
  assert.equal(today.branches[1]._id.toString(), unpinned._id.toString());
  assert.equal(today.branches[1].pinned, false);
  assert.equal(String(today.openVisit._id), String(visit._id));
  assert.equal(today.openVisit.flags.lateByMinutes, 4);
  assert.equal(String(slot._id), String(today.branches[0].classes[0].slotId));

  const history = await getTeacherHistory({ teacherId: teacher._id, month: "2026-09", now: at("16:10") });
  assert.equal(history.totals.lateCheckIns, 1);
  assert.equal(history.visits[0].adminNotes, undefined, "admin notes stay with the admin");
});
