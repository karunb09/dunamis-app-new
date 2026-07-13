const mongoose = require("mongoose");
const Slot = require("../model/slot.model");
const ClassRoster = require("../model/classRoster.model");

// How many weeks of dated slots to keep generated ahead of today.
const ROLLING_WEEKS = 3;

const startOfDay = (value) => {
  const date = new Date(value || new Date());
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value) => {
  const date = new Date(value || new Date());
  date.setHours(23, 59, 59, 999);
  return date;
};

const rollingRange = (from = new Date()) => ({
  rangeStart: startOfDay(from),
  rangeEnd: endOfDay(new Date(startOfDay(from).getTime() + ROLLING_WEEKS * 7 * 86400000)),
});

const maxStudentsFor = (sessionType) => (sessionType === "premium" ? 1 : 4);

// Upserts the recurring-class roster for a fulfilled transaction and adds the
// student as an active member. Throws if the class is at capacity so the caller
// can route the payment to manual fulfillment. Returns null when the enrollment
// has no recurring class (no parentAvailabilityId).
const registerRosterMembership = async (transaction) => {
  const parentAvailabilityId = transaction.parentAvailabilityId;
  if (!parentAvailabilityId) return null;

  const slot = await Slot.findById(transaction.slotId).select(
    "sessionType recurringDays startTime endTime branchId maxStudents"
  );

  const sessionType = transaction.sessionType || slot?.sessionType || "standard";
  const maxStudents = slot?.maxStudents || maxStudentsFor(sessionType);

  const roster = await ClassRoster.findOneAndUpdate(
    { parentAvailabilityId },
    {
      $setOnInsert: {
        teacherId: transaction.teacherId,
        courseId: transaction.courseId,
        parentAvailabilityId,
        branchId: transaction.branchId || slot?.branchId || null,
        deliveryMode: transaction.deliveryMode || null,
        sessionType,
        recurringDays: slot?.recurringDays || [],
        startTime: slot?.startTime || "",
        endTime: slot?.endTime || "",
        maxStudents,
        status: "active",
      },
    },
    { new: true, upsert: true }
  );

  const alreadyActive = (roster.students || []).some(
    (member) =>
      String(member.studentId) === String(transaction.studentId) &&
      member.status === "active"
  );
  if (alreadyActive) return roster;

  const activeCount = (roster.students || []).filter(
    (member) => member.status === "active"
  ).length;
  if (activeCount >= roster.maxStudents) {
    throw new Error("Selected class is full. Payment requires manual fulfillment.");
  }

  await ClassRoster.updateOne(
    { _id: roster._id, "students.studentId": { $ne: transaction.studentId } },
    {
      $push: {
        students: {
          studentId: transaction.studentId,
          transactionRef: transaction._id,
          status: "active",
          enrolledAt: new Date(),
        },
      },
    }
  );

  return ClassRoster.findById(roster._id);
};

// Sets each enrolled slot's students from the roster for its recurring class.
// Only touches current/future slots (date >= today) so past attendance is never
// rewritten. The roster is authoritative for enrolled-class membership.
const applyRostersToSlots = async ({ teacherId, rangeStart, rangeEnd }) => {
  if (!teacherId) return { updated: 0 };

  const rosters = await ClassRoster.find({ teacherId, status: "active" })
    .select("parentAvailabilityId students")
    .lean();
  if (!rosters.length) return { updated: 0 };

  const byParent = new Map();
  for (const roster of rosters) {
    const ids = (roster.students || [])
      .filter((member) => member.status === "active")
      .map((member) => String(member.studentId));
    byParent.set(String(roster.parentAvailabilityId), ids);
  }

  const from = new Date(Math.max(startOfDay(rangeStart).getTime(), startOfDay().getTime()));
  const slots = await Slot.find({
    createdBy: teacherId,
    slotType: "enrolled",
    date: { $gte: from, $lte: endOfDay(rangeEnd) },
  }).select("_id parentAvailabilityId students");

  const ops = [];
  for (const slot of slots) {
    const desired = byParent.get(String(slot.parentAvailabilityId)) || [];
    const current = (slot.students || []).map(String);
    const unchanged =
      desired.length === current.length &&
      desired.every((id) => current.includes(id));
    if (unchanged) continue;

    ops.push({
      updateOne: {
        filter: { _id: slot._id },
        update: {
          $set: {
            students: desired.map((id) => new mongoose.Types.ObjectId(id)),
            currentStudentsCount: desired.length,
          },
        },
      },
    });
  }

  if (ops.length) await Slot.bulkWrite(ops, { ordered: false });
  return { updated: ops.length };
};

// Recurring schedule for a student, derived from roster membership. Used by the
// admin student-detail and student portal views (independent of any one dated slot).
const getStudentSchedules = async (studentId) => {
  const rosters = await ClassRoster.find({
    "students.studentId": studentId,
    "students.status": "active",
    status: "active",
  })
    .select("teacherId courseId parentAvailabilityId branchId sessionType recurringDays startTime endTime")
    .lean();

  return rosters.map((roster) => ({
    teacherId: roster.teacherId,
    courseId: roster.courseId,
    parentAvailabilityId: roster.parentAvailabilityId,
    branchId: roster.branchId,
    sessionType: roster.sessionType,
    recurringDays: roster.recurringDays || [],
    startTime: roster.startTime,
    endTime: roster.endTime,
  }));
};

module.exports = {
  ROLLING_WEEKS,
  rollingRange,
  registerRosterMembership,
  applyRostersToSlots,
  getStudentSchedules,
};
