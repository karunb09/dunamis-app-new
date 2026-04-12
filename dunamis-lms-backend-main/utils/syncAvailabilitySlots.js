const Slot = require("../model/slot.model");
const Teacher = require("../model/teacher.model");
const DemoBooking = require("../model/demoBooking.model");

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const ACTIVE_DEMO_STATUSES = ["Booked", "Rescheduled"];

const getMaxStudentsForSlot = (slot = {}) => {
  if (slot.slotType === "demo") return 1;
  return slot.sessionType === "premium" ? 1 : 4;
};

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

const addDays = (value, days) => {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
};

const toIdString = (value) => {
  if (!value && value !== 0) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return String(value._id || value.id || value);
};

const toDateKey = (value) => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeAvailabilityEntry = (slot) => ({
  _id: slot?._id || null,
  days: Array.isArray(slot?.days)
    ? slot.days.map((day) => String(day).trim().toLowerCase()).filter(Boolean)
    : [],
  startTime: slot?.startTime || "",
  endTime: slot?.endTime || "",
  sessionType: slot?.sessionType || "",
  slotType: slot?.slotType || "",
  maxStudents: getMaxStudentsForSlot(slot),
  courseId: toIdString(slot?.courseId),
  branchId: toIdString(slot?.branchId) || null,
});

const buildRecurringSlotKey = (slot) => [
  toIdString(slot?.parentAvailabilityId),
  toDateKey(slot?.date),
  slot?.startTime || "",
  slot?.endTime || "",
  slot?.slotType || "",
  slot?.sessionType || "",
  toIdString(slot?.courseId),
  toIdString(slot?.branchId) || "",
].join("|");

const buildDesiredSlotDocs = ({
  teacherId,
  availability,
  rangeStart,
  rangeEnd,
}) => {
  const docs = [];
  const seen = new Set();

  for (const rawSlot of availability) {
    const slot = normalizeAvailabilityEntry(rawSlot);
    if (
      !slot._id ||
      !slot.courseId ||
      !slot.days.length ||
      !slot.startTime ||
      !slot.endTime ||
      !["demo", "enrolled"].includes(slot.slotType) ||
      !["standard", "premium"].includes(slot.sessionType)
    ) {
      continue;
    }

    for (
      const current = new Date(rangeStart);
      current <= rangeEnd;
      current.setDate(current.getDate() + 1)
    ) {
      const weekday = DAY_NAMES[current.getDay()];
      if (!slot.days.includes(weekday)) {
        continue;
      }

      const date = startOfDay(current);
      const doc = {
        courseId: slot.courseId,
        branchId: slot.branchId || null,
        date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        createdBy: teacherId,
        slotType: slot.slotType,
        sessionType: slot.sessionType,
        recurringDays: slot.days,
        isRecurring: true,
        maxStudents: slot.maxStudents,
        parentAvailabilityId: slot._id,
      };

      const key = buildRecurringSlotKey(doc);
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      docs.push(doc);
    }
  }

  return docs;
};

const deleteObsoleteRecurringSlots = async (slots = [], desiredKeys = new Set()) => {
  const unneededSlots = slots.filter((slot) => {
    if (desiredKeys.has(buildRecurringSlotKey(slot))) {
      return false;
    }

    return (slot.students || []).length === 0;
  });

  if (!unneededSlots.length) {
    return 0;
  }

  const slotIds = unneededSlots.map((slot) => slot._id);
  const bookedDemoSlots = await DemoBooking.distinct("slotId", {
    slotId: { $in: slotIds },
    demoStatus: { $in: ACTIVE_DEMO_STATUSES },
  });
  const bookedSlotIds = new Set(bookedDemoSlots.map((id) => String(id)));

  const removableIds = unneededSlots
    .filter((slot) => !bookedSlotIds.has(String(slot._id)))
    .map((slot) => slot._id);

  if (!removableIds.length) {
    return 0;
  }

  await Slot.deleteMany({ _id: { $in: removableIds } });
  return removableIds.length;
};

const syncTeacherAvailabilitySlots = async ({
  teacher,
  teacherId,
  rangeStart,
  rangeEnd,
  replaceExisting = false,
}) => {
  const resolvedTeacher =
    teacher ||
    (teacherId
      ? await Teacher.findById(teacherId).select("weeklyAvailability")
      : null);

  if (!resolvedTeacher) {
    return { created: 0, deleted: 0 };
  }

  const start = startOfDay(rangeStart || new Date());
  const end = endOfDay(rangeEnd || addDays(start, 20));
  const availability = Array.isArray(resolvedTeacher.weeklyAvailability)
    ? resolvedTeacher.weeklyAvailability
    : [];

  const desiredDocs = buildDesiredSlotDocs({
    teacherId: resolvedTeacher._id,
    availability,
    rangeStart: start,
    rangeEnd: end,
  });
  const desiredKeys = new Set(desiredDocs.map(buildRecurringSlotKey));

  const existingSlots = await Slot.find({
    createdBy: resolvedTeacher._id,
    isRecurring: true,
    date: { $gte: start, $lte: end },
  }).select(
    "_id courseId branchId date startTime endTime slotType sessionType students parentAvailabilityId"
  );

  const existingKeys = new Set(existingSlots.map(buildRecurringSlotKey));
  const docsToCreate = desiredDocs.filter(
    (doc) => !existingKeys.has(buildRecurringSlotKey(doc))
  );

  if (docsToCreate.length) {
    await Slot.insertMany(docsToCreate, { ordered: false });
  }

  let deleted = 0;
  if (replaceExisting) {
    deleted = await deleteObsoleteRecurringSlots(existingSlots, desiredKeys);
  }

  return { created: docsToCreate.length, deleted };
};

module.exports = {
  syncTeacherAvailabilitySlots,
  startOfDay,
  endOfDay,
  addDays,
};
