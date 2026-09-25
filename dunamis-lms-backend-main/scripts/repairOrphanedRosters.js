/**
 * Repair: re-point ClassRoster docs whose parentAvailabilityId no longer exists,
 * and backfill enrolled students into the dated slots generated while the roster
 * was orphaned, so instructors can mark the attendance they missed.
 *
 * Saving weekly availability replaces Teacher.weeklyAvailability wholesale, so
 * Mongoose mints a new subdocument _id for every entry — including untouched
 * ones. ClassRoster is keyed by that _id, so every save orphans every roster of
 * that teacher and applyRostersToSlots then writes students: [] into their
 * future slots.
 *
 * Dry-runs by default. Idempotent — safe to re-run.
 *
 * Run from dunamis-lms-backend-main/:
 *   node scripts/repairOrphanedRosters.js
 *   node scripts/repairOrphanedRosters.js --confirm
 *   node scripts/repairOrphanedRosters.js --confirm --map <rosterId>=<availabilityId>,...
 */

require("dotenv").config();
const mongoose = require("mongoose");

// Registered for the teacher.userId populate — index.js does this for the app.
require("../model/user.model");
const Teacher = require("../model/teacher.model");
const Student = require("../model/student.model");
const Slot = require("../model/slot.model");
const ClassRoster = require("../model/classRoster.model");
const AttendanceHomework = require("../model/attendanceHomework.model");
const { rollingRange, applyRostersToSlots, startOfDay, endOfDay } = require("../utils/classRoster");

const CONFIRM = process.argv.includes("--confirm");

// A roster with no propagated slot at all falls back to this many days of
// backfill rather than trawling its whole history.
const MAX_BACKFILL_DAYS = 90;

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const parseMap = () => {
  const flagIndex = process.argv.indexOf("--map");
  if (flagIndex === -1) return new Map();
  const raw = process.argv[flagIndex + 1] || "";
  const entries = raw
    .split(",")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => pair.split("="));
  return new Map(entries.map(([roster, availability]) => [String(roster), String(availability)]));
};

const signature = ({ courseId, days, startTime, endTime, sessionType, branchId }) =>
  [
    String(courseId || ""),
    [...(days || [])].map((d) => String(d).toLowerCase()).sort().join("+"),
    String(startTime || ""),
    String(endTime || ""),
    String(sessionType || ""),
    String(branchId || ""),
  ].join("|");

const addDays = (date, n) => new Date(startOfDay(date).getTime() + n * 86400000);

const short = (value) => String(value || "").slice(-6);

const fmtDate = (date) => new Date(date).toISOString().slice(0, 10);

const teacherLabel = (teacher) => {
  const name = teacher?.userId?.name;
  if (!name) return short(teacher?._id);
  return [name.firstName, name.lastName].filter(Boolean).join(" ");
};

async function loadAvailability() {
  const teachers = await Teacher.find({})
    .select("weeklyAvailability userId")
    .populate("userId", "name")
    .lean();

  const byId = new Map();
  const byTeacherSignature = new Map();

  for (const teacher of teachers) {
    for (const entry of teacher.weeklyAvailability || []) {
      const record = { entry, teacher };
      byId.set(String(entry._id), record);
      if (entry.slotType !== "enrolled") continue;
      const key = `${teacher._id}|${signature(entry)}`;
      if (!byTeacherSignature.has(key)) byTeacherSignature.set(key, []);
      byTeacherSignature.get(key).push(record);
    }
  }

  return { teachers, byId, byTeacherSignature };
}

function bucketRosters(rosters, availability, manualMap) {
  const claimed = new Set();
  for (const roster of rosters) {
    if (availability.byId.has(String(roster.parentAvailabilityId))) {
      claimed.add(String(roster.parentAvailabilityId));
    }
  }

  const rows = [];
  for (const roster of rosters) {
    const activeCount = (roster.students || []).filter((m) => m.status === "active").length;
    const row = { roster, activeCount, target: null, result: null, note: "" };

    const mapped = manualMap.get(String(roster._id));
    if (mapped) {
      const record = availability.byId.get(mapped);
      if (!record) {
        row.result = "MAP-INVALID";
        row.note = "availability id not found";
      } else if (String(record.teacher._id) !== String(roster.teacherId)) {
        row.result = "MAP-INVALID";
        row.note = "availability belongs to another instructor";
      } else if (claimed.has(mapped) && String(roster.parentAvailabilityId) !== mapped) {
        row.result = "MAP-INVALID";
        row.note = "target already carries a roster";
      } else {
        row.target = record;
        row.result = "MAPPED";
        claimed.add(mapped);
      }
      rows.push(row);
      continue;
    }

    if (availability.byId.has(String(roster.parentAvailabilityId))) {
      row.result = "INTACT";
      rows.push(row);
      continue;
    }

    const key = `${roster.teacherId}|${signature({
      courseId: roster.courseId,
      days: roster.recurringDays,
      startTime: roster.startTime,
      endTime: roster.endTime,
      sessionType: roster.sessionType,
      branchId: roster.branchId,
    })}`;
    const candidates = availability.byTeacherSignature.get(key) || [];

    if (candidates.length === 0) {
      row.result = "UNMATCHED";
      row.note = "no current class with this schedule";
    } else if (candidates.length > 1) {
      row.result = "AMBIGUOUS";
      row.note = `${candidates.length} candidates`;
    } else if (claimed.has(String(candidates[0].entry._id))) {
      row.result = "CONFLICT";
      row.note = `target ${short(candidates[0].entry._id)} already has a roster`;
    } else {
      row.target = candidates[0];
      row.result = "MATCHED";
      claimed.add(String(candidates[0].entry._id));
    }

    rows.push(row);
  }

  return rows;
}

async function findBackfillSlots(row) {
  const { roster, target } = row;
  const entry = target.entry;
  const activeIds = (roster.students || [])
    .filter((m) => m.status === "active")
    .map((m) => m.studentId);
  if (!activeIds.length) return { from: null, slots: [], skipped: [] };

  const lastPropagated = await Slot.findOne({
    createdBy: roster.teacherId,
    slotType: "enrolled",
    students: { $in: activeIds },
  })
    .sort({ date: -1 })
    .select("date")
    .lean();

  const floor = addDays(new Date(), -MAX_BACKFILL_DAYS);
  const from = lastPropagated
    ? new Date(Math.max(addDays(lastPropagated.date, 1).getTime(), floor.getTime()))
    : new Date(Math.max(startOfDay(roster.createdAt).getTime(), floor.getTime()));

  const days = (entry.days || []).map((d) => String(d).toLowerCase());
  const candidates = await Slot.find({
    createdBy: roster.teacherId,
    slotType: "enrolled",
    courseId: roster.courseId,
    startTime: entry.startTime,
    endTime: entry.endTime,
    date: { $gte: from, $lte: endOfDay(new Date()) },
  })
    .sort({ date: 1 })
    .select("_id date startTime endTime students parentAvailabilityId")
    .lean();

  const byDate = new Map();
  for (const slot of candidates) {
    if (!days.includes(WEEKDAYS[new Date(slot.date).getDay()])) continue;
    const key = fmtDate(slot.date);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key).push(slot);
  }

  const slots = [];
  const skipped = [];
  for (const [key, group] of byDate) {
    if (group.length > 1) {
      skipped.push(`${key}: ${group.length} candidate slots, needs a human`);
      continue;
    }
    const slot = group[0];
    if ((slot.students || []).length) {
      skipped.push(`${key}: slot already has students`);
      continue;
    }
    const marked = await AttendanceHomework.countDocuments({ slotId: slot._id });
    if (marked) {
      skipped.push(`${key}: attendance already recorded`);
      continue;
    }
    slots.push(slot);
  }

  return { from, slots, skipped };
}

function printTable(rows) {
  const header = [
    "ROSTER".padEnd(8),
    "INSTRUCTOR".padEnd(18),
    "DAYS".padEnd(14),
    "TIME".padEnd(13),
    "ACT".padEnd(4),
    "OLD".padEnd(8),
    "NEW".padEnd(8),
    "FILL".padEnd(5),
    "RESULT",
  ].join(" ");
  console.log(header);
  console.log("-".repeat(header.length));

  for (const row of rows) {
    const { roster } = row;
    console.log(
      [
        short(roster._id).padEnd(8),
        teacherLabel(row.teacher).slice(0, 18).padEnd(18),
        (roster.recurringDays || []).map((d) => d.slice(0, 3)).join("/").padEnd(14),
        `${roster.startTime}-${roster.endTime}`.padEnd(13),
        String(row.activeCount).padEnd(4),
        short(roster.parentAvailabilityId).padEnd(8),
        (row.target ? short(row.target.entry._id) : "-").padEnd(8),
        String(row.backfill ? row.backfill.slots.length : 0).padEnd(5),
        row.note ? `${row.result} (${row.note})` : row.result,
      ].join(" ")
    );
    for (const skip of row.backfill?.skipped || []) {
      console.log(`${" ".repeat(8)} skipped ${skip}`);
    }
  }
}

async function reportStaleEnrollmentSlots() {
  const students = await Student.find({ "enrolledCourses.active": true })
    .select("enrolledCourses")
    .lean();

  const slotIds = new Set();
  for (const student of students) {
    for (const enrollment of student.enrolledCourses || []) {
      if (enrollment.active && enrollment.slotId) slotIds.add(String(enrollment.slotId));
    }
  }
  if (!slotIds.size) return 0;

  const found = await Slot.find({ _id: { $in: [...slotIds] } }).select("_id").lean();
  return slotIds.size - found.length;
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URL, {
    maxPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
  });
  const { host, name } = mongoose.connection;
  console.log(`DB connected — ${host}/${name}`);
  console.log(`MODE: ${CONFIRM ? "APPLYING CHANGES" : "DRY RUN (no writes)"}\n`);

  const manualMap = parseMap();
  const availability = await loadAvailability();
  const rosters = await ClassRoster.find({ status: "active" }).lean();
  console.log(
    `${rosters.length} active roster(s), ${availability.byId.size} live availability entr(ies)\n`
  );

  const rows = bucketRosters(rosters, availability, manualMap);

  for (const row of rows) {
    row.teacher = row.target
      ? row.target.teacher
      : availability.teachers.find((t) => String(t._id) === String(row.roster.teacherId));
    if (row.target) row.backfill = await findBackfillSlots(row);
  }

  printTable(rows);

  const tally = rows.reduce((acc, row) => {
    acc[row.result] = (acc[row.result] || 0) + 1;
    return acc;
  }, {});
  console.log(
    `\n${Object.entries(tally)
      .map(([key, value]) => `${key}: ${value}`)
      .join("   ")}`
  );

  const repairable = rows.filter((row) => row.result === "MATCHED" || row.result === "MAPPED");
  const unresolved = rows.filter((row) =>
    ["AMBIGUOUS", "UNMATCHED", "CONFLICT", "MAP-INVALID"].includes(row.result)
  );

  if (!CONFIRM) {
    const backfillTotal = repairable.reduce((n, row) => n + row.backfill.slots.length, 0);
    console.log(
      `\nWould re-point ${repairable.length} roster(s) and backfill ${backfillTotal} missed class(es).`
    );
    console.log("Re-run with --confirm to apply.");
    for (const row of unresolved) {
      console.log(
        `  ${row.result} ${short(row.roster._id)} (${row.roster._id}) — ${row.note}; map it with --map`
      );
    }
    await mongoose.disconnect();
    process.exit(unresolved.length ? 1 : 0);
  }

  const touchedTeachers = new Set();
  let backfilled = 0;

  for (const row of repairable) {
    const { roster, target } = row;
    const entry = target.entry;

    // One at a time: parentAvailabilityId is unique, so a surprise E11000 must
    // name the roster rather than abort the batch.
    await ClassRoster.updateOne(
      { _id: roster._id },
      {
        $set: {
          parentAvailabilityId: entry._id,
          recurringDays: (entry.days || []).map((d) => String(d).toLowerCase()),
          startTime: entry.startTime,
          endTime: entry.endTime,
          sessionType: entry.sessionType,
          branchId: entry.branchId || null,
          maxStudents: entry.maxStudents || roster.maxStudents,
        },
      }
    );

    const activeIds = (roster.students || [])
      .filter((m) => m.status === "active")
      .map((m) => m.studentId);

    for (const slot of row.backfill.slots) {
      await Slot.updateOne(
        { _id: slot._id },
        {
          $set: {
            students: activeIds,
            currentStudentsCount: activeIds.length,
            parentAvailabilityId: entry._id,
          },
        }
      );
      backfilled += 1;
      console.log(
        `  backfilled ${fmtDate(slot.date)} ${slot.startTime} (${short(slot._id)}) with ${activeIds.length} learner(s)`
      );
    }

    touchedTeachers.add(String(roster.teacherId));
    console.log(
      `  re-pointed roster ${short(roster._id)} -> ${short(entry._id)} (${row.activeCount} active member(s))`
    );
  }

  const { rangeStart, rangeEnd } = rollingRange();
  for (const teacherId of touchedTeachers) {
    const result = await applyRostersToSlots({ teacherId, rangeStart, rangeEnd });
    console.log(`  teacher ${short(teacherId)}: ${result.updated} future slot(s) re-populated`);
  }

  const repairedParents = repairable.map((row) => row.target.entry._id);
  const stillEmpty = repairedParents.length
    ? await Slot.countDocuments({
        parentAvailabilityId: { $in: repairedParents },
        slotType: "enrolled",
        date: { $gte: startOfDay(new Date()) },
        students: { $size: 0 },
      })
    : 0;

  const staleEnrollmentSlots = await reportStaleEnrollmentSlots();

  console.log(
    `\nRe-pointed ${repairable.length} roster(s), backfilled ${backfilled} class(es), ${stillEmpty} future slot(s) still empty under repaired classes.`
  );
  console.log(
    `Active enrollments whose enrolledCourses[].slotId no longer resolves: ${staleEnrollmentSlots} (report only).`
  );
  for (const row of unresolved) {
    console.log(`  UNRESOLVED ${row.result} ${row.roster._id} — ${row.note}`);
  }

  await mongoose.disconnect();
  console.log("\nDone.");
  process.exit(unresolved.length ? 1 : 0);
}

run().catch(async (error) => {
  console.error("Repair failed:", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
