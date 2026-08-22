// Daily attendance report — every enrolled class scheduled on one IST day,
// joined to whatever attendance was recorded for it.
//
// It starts from Slot, not from AttendanceHomework, because the question this
// report exists to answer is "which classes did nobody mark?" — and a report
// built from submitted records cannot see a class that has none.

const AttendanceHomework = require("../model/attendanceHomework.model");
const ClassRoster = require("../model/classRoster.model");
// Registers the schemas the populates below resolve against. Without these the
// service only works when something else has already required them, and its
// section guard would turn the failure into a silently-zero report.
require("../model/branch.model");
require("../model/course.model");
require("../model/teacher.model");
require("../model/user.model");
const Slot = require("../model/slot.model");
const Student = require("../model/student.model");
const {
  currentDayKey,
  dayKeyFromDate,
  dayLabel,
  dayWindow,
  isValidDayKey,
} = require("../utils/istMonth");
const { formatUserName } = require("../utils/formatName");

const round1 = (n) => Math.round(n * 10) / 10;
const rateFrom = (value, base) => (base ? round1((value / base) * 100) : null);
const idOf = (value) => String(value?._id || value || "");

const emptyTotals = () => ({
  classesScheduled: 0,
  fullyMarked: 0,
  partiallyMarked: 0,
  unmarked: 0,
  studentsExpected: 0,
  studentsMarked: 0,
  present: 0,
  absent: 0,
  markingRate: null,
  attendanceRate: null,
  homeworkAssigned: 0,
  classesMarkedLate: 0,
});

// Only ever called for classes that have students; empty slots are dropped
// before this point. `>=` not `==` so a student removed after marking does not
// downgrade a completed class.
const coverageOf = (marked, expected) => {
  if (marked >= expected) return "Full";
  return marked === 0 ? "Missing" : "Partial";
};

async function buildDailyAttendanceReport({ dayKey, teacherId, courseId } = {}) {
  const key = isValidDayKey(dayKey) ? dayKey : currentDayKey();
  const { start, end } = dayWindow(key);

  const failed = [];
  const section = async (name, fn, fallback) => {
    try {
      return await fn();
    } catch (err) {
      console.error(`[AttendanceReport] section "${name}" failed:`, err.message);
      failed.push(name);
      return fallback;
    }
  };

  // No `"students.0": { $exists: true }` here — the roster fallback below can
  // still supply students for a slot whose own array was never populated. Slots
  // that genuinely have nobody are dropped after that resolves.
  // Served by the { date, slotType } index.
  const slots = await section(
    "classes",
    () =>
      Slot.find({
        slotType: "enrolled",
        date: { $gte: start, $lt: end },
        ...(teacherId ? { createdBy: teacherId } : {}),
        ...(courseId ? { courseId } : {}),
      })
        .populate("courseId", "name")
        .populate({
          path: "createdBy",
          select: "userId",
          populate: { path: "userId", select: "name email employeeId" },
        })
        .populate({ path: "branchId", select: "branchName" })
        .sort({ startTime: 1 })
        .lean(),
    []
  );

  // A past slot's students[] is a frozen snapshot of who was actually expected
  // that day — applyRostersToSlots only runs from today forward. That is what an
  // auditor wants, so this deliberately inverts getTeacherClassAttendance's
  // roster-first priority; the roster is only a rescue for empty slots.
  const orphanParentIds = slots
    .filter((slot) => !(slot.students || []).length && slot.parentAvailabilityId)
    .map((slot) => slot.parentAvailabilityId);

  const rosters = await section(
    "rosters",
    () =>
      orphanParentIds.length
        ? ClassRoster.find({
            parentAvailabilityId: { $in: orphanParentIds },
            status: "active",
          })
            .select("parentAvailabilityId students")
            .lean()
        : [],
    []
  );
  const rosterByParent = new Map(
    rosters.map((roster) => [
      String(roster.parentAvailabilityId),
      (roster.students || []).filter((m) => m.status === "active").map((m) => m.studentId),
    ])
  );

  const expectedBySlot = new Map();
  for (const slot of slots) {
    const own = (slot.students || []).map(idOf);
    if (own.length) {
      expectedBySlot.set(String(slot._id), { ids: own, source: "slot" });
      continue;
    }
    const fromRoster = (rosterByParent.get(String(slot.parentAvailabilityId)) || []).map(idOf);
    expectedBySlot.set(String(slot._id), {
      ids: fromRoster,
      source: fromRoster.length ? "roster" : "slot",
    });
  }

  // Slot generation runs off teacher availability, so most occurrences never
  // had a student. Reporting them would bury the handful that matter — on prod
  // that was 62 empty sections against 4 real classes.
  const classSlots = slots.filter(
    (slot) => (expectedBySlot.get(String(slot._id))?.ids || []).length > 0
  );

  const slotIds = classSlots.map((slot) => slot._id);

  // Matched on slotId, never on date. slotId is the class's identity and cannot
  // drift; a date window would silently drop legacy rows stamped with their
  // submission date rather than the class date.
  const attendance = await section(
    "attendance",
    () =>
      slotIds.length
        ? AttendanceHomework.aggregate([
            { $match: { slotId: { $in: slotIds } } },
            {
              $group: {
                _id: "$slotId",
                marked: { $sum: 1 },
                present: {
                  $sum: { $cond: [{ $eq: ["$attendanceStatus", "Present"] }, 1, 0] },
                },
                absent: {
                  $sum: { $cond: [{ $eq: ["$attendanceStatus", "Absent"] }, 1, 0] },
                },
                homeworkCount: {
                  $sum: {
                    $cond: [
                      { $gt: [{ $strLenCP: { $ifNull: ["$homework", ""] } }, 0] },
                      1,
                      0,
                    ],
                  },
                },
                firstMarkedAt: { $min: "$createdAt" },
                lastMarkedAt: { $max: "$updatedAt" },
                entries: {
                  $push: {
                    studentId: "$studentId",
                    attendanceStatus: "$attendanceStatus",
                    homework: "$homework",
                  },
                },
              },
            },
          ])
        : [],
    []
  );
  const attendanceBySlot = new Map(attendance.map((row) => [String(row._id), row]));

  const studentIds = new Set();
  for (const slot of classSlots) {
    for (const id of expectedBySlot.get(String(slot._id)).ids) studentIds.add(id);
  }
  for (const row of attendance) {
    for (const item of row.entries) studentIds.add(idOf(item.studentId));
  }

  const students = await section(
    "students",
    () =>
      studentIds.size
        ? Student.find({ _id: { $in: [...studentIds] } })
            .select("userId")
            .populate("userId", "name")
            .lean()
        : [],
    []
  );
  const nameByStudent = new Map(
    students.map((student) => [String(student._id), formatUserName(student.userId?.name, "Student")])
  );

  const earliestSlot = await section(
    "bounds",
    () => Slot.findOne({ slotType: "enrolled" }).sort({ date: 1 }).select("date").lean(),
    null
  );

  const classes = classSlots.map((slot) => {
    const slotKey = String(slot._id);
    const row = attendanceBySlot.get(slotKey);
    const { ids: expectedIds, source } = expectedBySlot.get(slotKey) || { ids: [], source: "slot" };

    const marks = new Map(
      (row?.entries || []).map((item) => [idOf(item.studentId), item])
    );
    const rosterIds = new Set(expectedIds);
    // A student marked but no longer on the slot still belongs in the list.
    for (const id of marks.keys()) rosterIds.add(id);

    const expectedStudents = expectedIds.length;
    const markedStudents = row?.marked || 0;

    return {
      slotId: slot._id,
      courseId: slot.courseId?._id || slot.courseId || null,
      courseName: slot.courseId?.name || "Unknown course",
      teacherId: slot.createdBy?._id || slot.createdBy || null,
      teacherName: formatUserName(slot.createdBy?.userId?.name, "Unknown instructor"),
      teacherEmail: slot.createdBy?.userId?.email || null,
      employeeId: slot.createdBy?.userId?.employeeId || null,
      branchId: slot.branchId?._id || slot.branchId || null,
      branchName: slot.branchId?.branchName || null,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      sessionType: slot.sessionType,
      batchLabel: slot.batchLabel || null,
      parentAvailabilityId: slot.parentAvailabilityId || null,
      expectedStudents,
      expectedSource: source,
      markedStudents,
      present: row?.present || 0,
      absent: row?.absent || 0,
      homeworkCount: row?.homeworkCount || 0,
      coverageStatus: coverageOf(markedStudents, expectedStudents),
      // Attendance entered after the class day ended — the signal the old
      // createdAt-keyed digest was hiding.
      markedLate: Boolean(row?.firstMarkedAt && new Date(row.firstMarkedAt) >= end),
      firstMarkedAt: row?.firstMarkedAt || null,
      lastMarkedAt: row?.lastMarkedAt || null,
      students: [...rosterIds].map((id) => {
        const mark = marks.get(id);
        return {
          studentId: id,
          name: nameByStudent.get(id) || "Unknown student",
          attendanceStatus: mark?.attendanceStatus || null,
          homework: mark?.homework || "",
          marked: Boolean(mark),
        };
      }),
    };
  });

  const totals = classes.reduce((acc, item) => {
    acc.classesScheduled += 1;
    if (item.coverageStatus === "Full") acc.fullyMarked += 1;
    if (item.coverageStatus === "Partial") acc.partiallyMarked += 1;
    if (item.coverageStatus === "Missing") acc.unmarked += 1;
    acc.studentsExpected += item.expectedStudents;
    acc.studentsMarked += item.markedStudents;
    acc.present += item.present;
    acc.absent += item.absent;
    acc.homeworkAssigned += item.homeworkCount;
    if (item.markedLate) acc.classesMarkedLate += 1;
    return acc;
  }, emptyTotals());
  totals.markingRate = rateFrom(totals.studentsMarked, totals.studentsExpected);
  totals.attendanceRate = rateFrom(totals.present, totals.studentsMarked);

  const groupBy = (keyFn, seed) => {
    const map = new Map();
    for (const item of classes) {
      const id = keyFn(item);
      if (!map.has(id)) map.set(id, seed(item));
      const bucket = map.get(id);
      bucket.scheduled += 1;
      if (item.coverageStatus === "Full") bucket.fullyMarked += 1;
      if (item.coverageStatus === "Partial") bucket.partiallyMarked += 1;
      if (item.coverageStatus === "Missing") bucket.unmarked += 1;
      bucket.expected += item.expectedStudents;
      bucket.marked += item.markedStudents;
      bucket.present += item.present;
      bucket.absent += item.absent;
    }
    return [...map.values()].sort((a, b) => b.unmarked - a.unmarked || b.scheduled - a.scheduled);
  };

  const counters = {
    scheduled: 0,
    fullyMarked: 0,
    partiallyMarked: 0,
    unmarked: 0,
    expected: 0,
    marked: 0,
    present: 0,
    absent: 0,
  };

  const byInstructor = groupBy(
    (item) => String(item.teacherId),
    (item) => ({
      teacherId: item.teacherId,
      teacherName: item.teacherName,
      teacherEmail: item.teacherEmail,
      employeeId: item.employeeId,
      ...counters,
    })
  );

  const byCourse = groupBy(
    (item) => String(item.courseId),
    (item) => ({ courseId: item.courseId, courseName: item.courseName, ...counters })
  );

  return {
    success: true,
    generatedAt: new Date().toISOString(),
    partial: failed.length > 0,
    failedSections: failed,
    day: { key, label: dayLabel(key), start, end, isToday: key === currentDayKey() },
    bounds: {
      earliest: earliestSlot ? dayKeyFromDate(new Date(earliestSlot.date)) : key,
      latest: currentDayKey(),
    },
    totals,
    byInstructor,
    byCourse,
    classes,
  };
}

module.exports = { buildDailyAttendanceReport };
