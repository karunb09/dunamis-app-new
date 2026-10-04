"use strict";

// Integration tests for branch check-in by staff — AAs at their branches and
// BDEs across their zones. Staff have no classes, so a day is judged at its two
// ends against the branch's own hours: the first check-in against opening, the
// last check-out against closing. Everything else (geofence, server time,
// immutable records, notes) follows the instructor rules.
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
const StaffCheckIn = require("../model/staffCheckIn.model");
const StaffCheckInReminder = require("../model/staffCheckInReminder.model");
const User = require("../model/user.model");
const notificationService = require("../utils/notificationService");
const {
  addStaffNote,
  buildStaffCheckInReport,
  checkIn,
  checkOut,
  getStaffHistory,
  getStaffToday,
  staffCheckInAccess,
} = require("../services/staffCheckIn");
const { sendCheckInReminders } = require("../services/checkInReminder");
const { istDayStart } = require("../utils/istMonth");

const oid = () => new mongoose.Types.ObjectId();

const DAY = "2026-09-15"; // a Tuesday
const NEXT_DAY = "2026-09-16";
const SUNDAY = "2026-09-20";

const at = (hhmm, { seconds = 0, day = DAY } = {}) => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(istDayStart(day).getTime() + ((h * 60 + m) * 60 + seconds) * 1000);
};

const PIN = { lat: 17.4156, lng: 78.4347 };
const near = { lat: PIN.lat + 0.00045, lng: PIN.lng, accuracyM: 20 }; // ~50 m
const faraway = { lat: PIN.lat + 0.0288, lng: PIN.lng, accuracyM: 20 }; // ~3.2 km

let seq = 0;
let emails = [];
const realSendEmails = notificationService.sendEmails;

async function makeBranch({ zone = oid(), timings = ["10:00", "19:00"], pinned = true } = {}) {
  seq += 1;
  return Branch.create({
    branchName: `Branch ${seq}`,
    location: "Road No. 1",
    branchManager: oid(),
    branchAdminEmail: "branch@test.com",
    branchAdminContact: "9999999999",
    zone,
    city: oid(),
    branchTimings: timings,
    branchOpenDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
    branchCapacity: 20,
    status: "active",
    ...(pinned ? { geo: { ...PIN } } : {}),
  });
}

async function makeStaff(firstName, org) {
  seq += 1;
  return User.create({
    name: { firstName, lastName: "Sharma" },
    password: "x",
    mobileNo: 9100000000 + seq,
    email: `s${seq}@test.com`,
    accountType: "admin",
    org,
  });
}

const aaAt = (branches, extra = {}) =>
  makeStaff("Asha", { designation: "aa", workMode: "offline", branches: branches.map((b) => b._id), ...extra });

const rejectsWith = (promise, statusCode, pattern) =>
  assert.rejects(promise, (err) => {
    assert.equal(err.statusCode, statusCode, err.message);
    if (pattern) assert.match(err.message, pattern);
    return true;
  });

const dayOf = async (userId, day = DAY, now = at("23:00", { day })) => {
  const report = await buildStaffCheckInReport({ from: day, to: day, userId, now });
  return report.days[0];
};

before(async () => {
  await startMemoryMongo();
  await StaffCheckIn.init();
  await StaffCheckInReminder.init();
  notificationService.sendEmails = async (payload) => {
    emails.push(payload);
  };
});
after(async () => {
  notificationService.sendEmails = realSendEmails;
  await stopMemoryMongo();
});
beforeEach(async () => {
  await clearCollections();
  emails = [];
});

// ── Who checks in, and where ──────────────────────────────────────────────

test("offline AAs and BDEs get check-in; online-only staff and other roles don't", async () => {
  const zone = oid();
  const a = await makeBranch({ zone });
  const b = await makeBranch({ zone });
  await makeBranch();

  const aa = await aaAt([a]);
  const both = await makeStaff("Ravi", { designation: "aa", workMode: "both", branches: [a._id], courses: [oid()] });
  const bde = await makeStaff("Kiran", { designation: "bde", workMode: "offline", zones: [zone] });
  const onlineAa = await makeStaff("Neha", { designation: "aa", workMode: "online", courses: [oid()] });
  const bdm = await makeStaff("Vik", { designation: "bdm", workMode: "offline", cities: [a.city] });
  const ceo = await makeStaff("Ceo", { designation: "ceo" });

  assert.deepEqual(await staffCheckInAccess(aa), { eligible: true, designation: "aa", branchCount: 1 });
  assert.equal((await staffCheckInAccess(both)).eligible, true);
  assert.deepEqual(await staffCheckInAccess(bde), { eligible: true, designation: "bde", branchCount: 2 });
  assert.equal((await staffCheckInAccess(onlineAa)).eligible, false);
  assert.equal((await staffCheckInAccess(bdm)).eligible, false);
  assert.equal((await staffCheckInAccess(ceo)).eligible, false);

  await rejectsWith(checkIn({ userId: onlineAa._id, branchId: a._id, fix: near, now: at("09:55") }), 403);
  // A BDE covers every branch in their zones, an AA only their own.
  await checkIn({ userId: bde._id, branchId: b._id, fix: near, now: at("09:55") });
  await rejectsWith(
    checkIn({ userId: aa._id, branchId: b._id, fix: near, now: at("09:55") }),
    403,
    /isn't one of your branches/
  );
});

// ── Late and early, judged per day ────────────────────────────────────────

test("one second after the branch opens is late; exactly at opening is not", async () => {
  const branch = await makeBranch();
  const onTime = await aaAt([branch]);
  const late = await aaAt([branch]);

  await checkIn({ userId: onTime._id, branchId: branch._id, fix: near, now: at("10:00") });
  await checkIn({ userId: late._id, branchId: branch._id, fix: near, now: at("10:00", { seconds: 1 }) });

  assert.equal((await dayOf(onTime._id)).lateCheckIn, false);
  const lateDay = await dayOf(late._id);
  assert.equal(lateDay.lateCheckIn, true);
  assert.equal(lateDay.lateByMinutes, 1);
});

test("leaving before the branch closes is an early logout, to the minute", async () => {
  const branch = await makeBranch();
  const aa = await aaAt([branch]);
  const visit = await checkIn({ userId: aa._id, branchId: branch._id, fix: near, now: at("09:58") });
  await checkOut({ userId: aa._id, visitId: visit._id, fix: near, now: at("18:44", { seconds: 30 }) });

  const day = await dayOf(aa._id);
  assert.equal(day.lateCheckIn, false);
  assert.equal(day.earlyCheckOut, true);
  assert.equal(day.earlyByMinutes, 16);
});

test("a BDE touring two branches is judged only at the day's two ends", async () => {
  const zone = oid();
  const a = await makeBranch({ zone, timings: ["10:00", "19:00"] });
  const b = await makeBranch({ zone, timings: ["11:00", "20:00"] });
  const bde = await makeStaff("Kiran", { designation: "bde", workMode: "offline", zones: [zone] });

  const first = await checkIn({ userId: bde._id, branchId: a._id, fix: near, now: at("09:59") });
  await checkOut({ userId: bde._id, visitId: first._id, fix: near, now: at("13:00") });
  // Mid-day, between branches: not an early logout yet, only "so far".
  const second = await checkIn({ userId: bde._id, branchId: b._id, fix: near, now: at("13:40") });
  await checkOut({ userId: bde._id, visitId: second._id, fix: near, now: at("20:05") });

  const day = await dayOf(bde._id);
  assert.equal(day.visits.length, 2);
  assert.deepEqual(day.branches, [a.branchName, b.branchName]);
  assert.equal(day.lateCheckIn, false, "13:40 at B is travel, not lateness");
  assert.equal(day.earlyCheckOut, false, "13:00 at A is travel, not an early logout");
  assert.equal(day.minutesOnSite, 181 + 385);
});

test("a day at a branch that is closed is recorded but not judged", async () => {
  const branch = await makeBranch();
  const aa = await aaAt([branch]);
  const visit = await checkIn({ userId: aa._id, branchId: branch._id, fix: near, now: at("12:00", { day: SUNDAY }) });
  await checkOut({ userId: aa._id, visitId: visit._id, fix: near, now: at("14:00", { day: SUNDAY }) });

  const day = await dayOf(aa._id, SUNDAY);
  assert.equal(day.branchClosedToday, true);
  assert.equal(day.lateCheckIn, false);
  assert.equal(day.earlyCheckOut, false);
});

test("changing the branch hours later doesn't change a past day", async () => {
  const branch = await makeBranch();
  const aa = await aaAt([branch]);
  const visit = await checkIn({ userId: aa._id, branchId: branch._id, fix: near, now: at("10:20") });
  await checkOut({ userId: aa._id, visitId: visit._id, fix: near, now: at("19:00") });

  await Branch.updateOne({ _id: branch._id }, { branchTimings: ["11:00", "17:00"] });
  const day = await dayOf(aa._id);
  assert.equal(day.lateByMinutes, 20, "still judged against 10:00, the hours on the day");
  assert.equal(day.earlyCheckOut, false);
});

// ── Visit lifecycle, same rules as instructors ───────────────────────────

test("geofence, late off-site check-out, and records that can't be redone", async () => {
  const branch = await makeBranch();
  const aa = await aaAt([branch]);

  await rejectsWith(
    checkIn({ userId: aa._id, branchId: branch._id, fix: faraway, now: at("09:55") }),
    422,
    /from Branch/
  );
  const visit = await checkIn({ userId: aa._id, branchId: branch._id, fix: near, now: at("09:55") });
  await rejectsWith(
    checkIn({ userId: aa._id, branchId: branch._id, fix: near, now: at("09:56") }),
    409,
    /already checked in/
  );

  await rejectsWith(
    checkOut({ userId: aa._id, visitId: visit._id, fix: faraway, now: at("19:29") }),
    422,
    /from anywhere/
  );
  const out = await checkOut({ userId: aa._id, visitId: visit._id, fix: faraway, now: at("19:30") });
  assert.equal(out.flags.lateCheckOut, true);
  assert.equal(out.checkOut.offSite, true);

  await rejectsWith(
    checkOut({ userId: aa._id, visitId: visit._id, fix: near, now: at("19:35") }),
    409,
    /already checked out/
  );
});

test("checking in at another branch closes the open visit as unclosed; previous days are closed", async () => {
  const zone = oid();
  const a = await makeBranch({ zone });
  const b = await makeBranch({ zone });
  const bde = await makeStaff("Kiran", { designation: "bde", workMode: "offline", zones: [zone] });

  const atA = await checkIn({ userId: bde._id, branchId: a._id, fix: near, now: at("10:00") });
  await checkIn({ userId: bde._id, branchId: b._id, fix: near, now: at("12:00") });
  assert.equal((await StaffCheckIn.findById(atA._id).lean()).status, "unclosed");

  const atB = await StaffCheckIn.findOne({ userId: bde._id, status: "open" }).lean();
  await rejectsWith(
    checkOut({ userId: bde._id, visitId: atB._id, fix: near, now: at("10:00", { day: NEXT_DAY }) }),
    409,
    /previous day/
  );

  const day = await dayOf(bde._id, DAY, at("10:00", { day: NEXT_DAY }));
  assert.equal(day.missingLogout, true);
});

test("a double tap can't open two visits", async () => {
  const branch = await makeBranch();
  const aa = await aaAt([branch]);
  const results = await Promise.allSettled([
    checkIn({ userId: aa._id, branchId: branch._id, fix: near, now: at("09:55") }),
    checkIn({ userId: aa._id, branchId: branch._id, fix: near, now: at("09:55") }),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(await StaffCheckIn.countDocuments({ status: "open" }), 1);
});

// ── Notes ────────────────────────────────────────────────────────────────

test("nobody notes their own visit; a correction sets hours but never the flags", async () => {
  const branch = await makeBranch();
  const aa = await aaAt([branch]);
  const bde = await makeStaff("Kiran", { designation: "bde", workMode: "offline", zones: [branch.zone] });
  const visit = await checkIn({ userId: aa._id, branchId: branch._id, fix: near, now: at("10:05") });

  const nextMorning = at("09:00", { day: NEXT_DAY });
  await rejectsWith(
    addStaffNote({ visitId: visit._id, userId: aa._id, note: "I left at 7", now: nextMorning }),
    403,
    /your own check-in/
  );
  await rejectsWith(
    addStaffNote({ visitId: visit._id, userId: bde._id, note: "x", correctedCheckOutAt: at("19:00"), now: at("12:00") }),
    409,
    /still checked in/
  );

  const noted = await addStaffNote({
    visitId: visit._id,
    userId: bde._id,
    note: "Confirmed with the branch — left at 7 pm",
    correctedCheckOutAt: at("19:00"),
    now: nextMorning,
  });
  assert.equal(noted.checkOut, null, "the original record is untouched");
  assert.equal(noted.minutesOnSite, 535);
  assert.equal(noted.adminNotes[0].by, "Kiran Sharma");

  const day = await dayOf(aa._id, DAY, nextMorning);
  assert.equal(day.missingLogout, true);
  assert.equal(day.lateByMinutes, 5);
  assert.equal(day.earlyCheckOut, false, "a correction never creates or clears a flag");
});

// ── Report ───────────────────────────────────────────────────────────────

test("no-check-in days count only finished open days, from the first staff check-in on", async () => {
  const branch = await makeBranch();
  const present = await aaAt([branch]);
  const absent = await aaAt([branch]);
  // createdAt is immutable through Mongoose; these accounts predate the range.
  await mongoose.connection
    .collection("users")
    .updateMany({}, { $set: { createdAt: at("09:00", { day: "2026-09-01" }) } });

  const now = at("12:00", { day: "2026-09-21" }); // Monday
  const before = await buildStaffCheckInReport({ from: "2026-09-14", to: "2026-09-21", now });
  assert.equal(before.totals.noCheckInDays, 0, "nothing counts before staff check-in is in use");

  await checkIn({ userId: present._id, branchId: branch._id, fix: near, now: at("10:00", { day: DAY }) });
  const report = await buildStaffCheckInReport({ from: "2026-09-14", to: "2026-09-21", now });
  const absentRow = report.summary.find((row) => String(row._id) === String(absent._id));
  // Tue 15 → Sat 19 (Sunday closed, Monday 21 not finished): 5 days.
  assert.equal(absentRow.noCheckInDays, 5);
  const presentRow = report.summary.find((row) => String(row._id) === String(present._id));
  assert.equal(presentRow.noCheckInDays, 4);
  assert.equal(presentRow.days, 1);

  await rejectsWith(buildStaffCheckInReport({ from: "2026-09-16", to: DAY, now }), 400);
});

test("a scoped viewer sees only visits at their branches, but the day is judged whole", async () => {
  const zone = oid();
  const a = await makeBranch({ zone });
  const b = await makeBranch({ zone });
  const bde = await makeStaff("Kiran", { designation: "bde", workMode: "offline", zones: [zone] });

  const first = await checkIn({ userId: bde._id, branchId: a._id, fix: near, now: at("09:59") });
  await checkOut({ userId: bde._id, visitId: first._id, fix: near, now: at("13:00") });
  await checkIn({ userId: bde._id, branchId: b._id, fix: near, now: at("14:00") });

  const report = await buildStaffCheckInReport({ from: DAY, to: DAY, branchIds: [b._id], now: at("15:00") });
  assert.equal(report.days.length, 1);
  assert.deepEqual(report.days[0].branches, [b.branchName], "branch A stays out of sight");
  assert.equal(report.days[0].lateCheckIn, false, "judged on the 09:59 check-in at A");
});

// ── Own pages ────────────────────────────────────────────────────────────

test("the staff member's own pages show their branches' hours and their days", async () => {
  const branch = await makeBranch({ timings: ["4:00 PM", "8:00 PM"] });
  const aa = await aaAt([branch]);
  const visit = await checkIn({ userId: aa._id, branchId: branch._id, fix: near, now: at("16:03") });

  const today = await getStaffToday({ userId: aa._id, now: at("16:10") });
  assert.equal(today.access.eligible, true);
  assert.equal(today.branches[0].hours.opensAt.getTime(), at("16:00").getTime());
  assert.equal(today.branches[0].hours.closesAt.getTime(), at("20:00").getTime());
  assert.equal(String(today.openVisit._id), String(visit._id));
  assert.equal(today.day.lateByMinutes, 3);

  const history = await getStaffHistory({ userId: aa._id, month: "2026-09", now: at("16:10") });
  assert.equal(history.totals.lateDays, 1);
  assert.equal(history.days[0].visits[0].adminNotes, undefined, "admin notes stay with the admin");
});

// ── Reminders ────────────────────────────────────────────────────────────

test("one missing-check-in email per person per day, once their branch has opened", async () => {
  const branch = await makeBranch();
  const someone = await aaAt([branch]);
  const forgetful = await aaAt([branch]);
  // Staff check-in is in use (an earlier day), so reminders are live.
  await StaffCheckIn.create({
    userId: someone._id,
    branchId: branch._id,
    dayKey: "2026-09-14",
    status: "closed",
    checkIn: { at: at("10:00", { day: "2026-09-14" }), lat: 1, lng: 1, accuracyM: 5 },
    expectedCheckOutAt: at("19:00", { day: "2026-09-14" }),
  });
  await checkIn({ userId: someone._id, branchId: branch._id, fix: near, now: at("09:58") });

  await sendCheckInReminders(at("09:59"));
  assert.equal(emails.length, 0, "nothing before the branch opens");

  await sendCheckInReminders(at("10:02"));
  assert.equal(emails.length, 1);
  assert.deepEqual(emails[0].recipients, [forgetful.email]);
  assert.match(emails[0].subject, /haven't checked in/);

  await sendCheckInReminders(at("10:07"));
  assert.equal(emails.length, 1, "already reminded today");
});

test("an open staff visit gets one check-out reminder 30 minutes after the branch closes", async () => {
  const branch = await makeBranch();
  const aa = await aaAt([branch]);
  await checkIn({ userId: aa._id, branchId: branch._id, fix: near, now: at("09:58") });

  await sendCheckInReminders(at("19:29"));
  assert.equal(emails.filter((e) => /checked out/.test(e.subject)).length, 0);
  await sendCheckInReminders(at("19:30"));
  await sendCheckInReminders(at("19:35"));
  const checkOutEmails = emails.filter((e) => /checked out/.test(e.subject));
  assert.equal(checkOutEmails.length, 1);
  assert.deepEqual(checkOutEmails[0].recipients, [aa.email]);
});
