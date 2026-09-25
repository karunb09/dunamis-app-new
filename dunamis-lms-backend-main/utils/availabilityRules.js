const Branch = require("../model/branch.model");

const SLOT_DURATION_RULES = {
  enrolled: {
    standard: 60,
    premium: 40,
  },
  demo: {
    standard: 20,
    premium: 20,
  },
};

const DAY_PAIR_OPTIONS = [
  { label: "Mon - Thu", days: ["monday", "thursday"] },
  { label: "Tue - Fri", days: ["tuesday", "friday"] },
  { label: "Wed - Sat", days: ["wednesday", "saturday"] },
  { label: "Sat - Sun", days: ["saturday", "sunday"] },
];

const ALLOWED_DAY_PAIRS = DAY_PAIR_OPTIONS.map((option) => option.days);

const VALID_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const IT_SUPPORT_HINT = process.env.IT_SUPPORT_EMAIL
  ? `Contact IT support at ${process.env.IT_SUPPORT_EMAIL} if this issue persists.`
  : "Contact IT support if this issue persists.";

const getExpectedDurationMinutes = (slot = {}) =>
  SLOT_DURATION_RULES[slot.slotType]?.[slot.sessionType] || null;

const sortedDays = (days = []) =>
  days.map((day) => String(day).toLowerCase()).sort();

const isAllowedDayPair = (days = []) => {
  const normalizedDays = sortedDays(days);
  return ALLOWED_DAY_PAIRS.some((pair) => {
    const normalizedPair = pair.slice().sort();
    return (
      normalizedPair.length === normalizedDays.length &&
      normalizedPair.every((day, index) => day === normalizedDays[index])
    );
  });
};

const getDayPairLabel = (days = []) => {
  const normalizedDays = sortedDays(days);
  const match = DAY_PAIR_OPTIONS.find((option) => {
    const normalizedPair = option.days.slice().sort();
    return (
      normalizedPair.length === normalizedDays.length &&
      normalizedPair.every((day, index) => day === normalizedDays[index])
    );
  });

  return match?.label || "";
};

// Strict "HH:MM" (24-hour) only — used wherever two stored times are compared.
const timeToMinutes = (timeStr) => {
  const match = String(timeStr || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return NaN;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    minutes < 0 ||
    minutes > 59 ||
    hours < 0 ||
    hours > 24 ||
    (hours === 24 && minutes !== 0)
  ) {
    return NaN;
  }

  return hours * 60 + minutes;
};

// Accepts "HH:MM" and "H:MM AM/PM" — branch timings are stored either way.
const parseTimeToMinutes = (timeStr) => {
  const raw = String(timeStr || "").trim();

  const hhmm = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) return Number(hhmm[1]) * 60 + Number(hhmm[2]);

  const ampm = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let h = Number(ampm[1]);
    const m = Number(ampm[2]);
    const period = ampm[3].toUpperCase();
    if (period === "AM" && h === 12) h = 0;
    if (period === "PM" && h !== 12) h += 12;
    return h * 60 + m;
  }

  return NaN;
};

// Identity of a recurring class by what it is, not by its subdocument _id.
// Lets a save re-match an entry whose _id the client did not send back.
const availabilitySignature = (entry = {}) =>
  [
    String(entry.courseId || ""),
    sortedDays(entry.days).join("+"),
    String(entry.startTime || ""),
    String(entry.endTime || ""),
    String(entry.slotType || ""),
    String(entry.sessionType || ""),
    String(entry.branchId || ""),
  ].join("|");

const scheduleSnapshot = (entry = {}) => ({
  days: sortedDays(entry.days),
  startTime: entry.startTime || "",
  endTime: entry.endTime || "",
  sessionType: entry.sessionType || "",
  slotType: entry.slotType || "enrolled",
  branchId: entry.branchId || null,
  maxStudents: entry.maxStudents ?? null,
});

const sameSchedule = (a = {}, b = {}) =>
  availabilitySignature(a) === availabilitySignature(b);

// Pairs each incoming entry with the existing subdocument it continues, so the
// subdocument _id survives the save. ClassRoster is keyed by that _id, so a new
// id orphans the roster and blanks the class.
const resolveAvailabilityEntries = (incoming = [], existing = []) => {
  const byId = new Map(existing.map((entry) => [String(entry._id), entry]));
  const bySignature = new Map();
  for (const entry of existing) {
    const key = availabilitySignature(entry);
    if (!bySignature.has(key)) bySignature.set(key, []);
    bySignature.get(key).push(entry);
  }

  const consumed = new Set();
  return incoming.map((slot) => {
    const claimed = String(slot._id || "");
    // A client id that is not ours falls through to signature matching — never
    // let a payload graft another class's roster onto this entry.
    if (claimed && byId.has(claimed) && !consumed.has(claimed)) {
      consumed.add(claimed);
      return { slot, previous: byId.get(claimed) };
    }

    const candidate = (bySignature.get(availabilitySignature(slot)) || []).find(
      (entry) => !consumed.has(String(entry._id))
    );
    if (candidate) {
      consumed.add(String(candidate._id));
      return { slot, previous: candidate };
    }

    return { slot, previous: null };
  });
};

// Shape / duration / day-pair / branch-hours rules for a set of entries.
// Returns an error message, or null when every entry is valid.
const validateAvailabilityEntries = async (entries = []) => {
  for (const slot of entries) {
    if (
      !Array.isArray(slot.days) ||
      slot.days.length === 0 ||
      !slot.startTime ||
      !slot.endTime
    ) {
      return "Each slot must include at least one valid day, startTime and endTime";
    }

    for (const day of slot.days) {
      if (!VALID_DAYS.includes(String(day).toLowerCase())) {
        return `Invalid day: ${day}`;
      }
    }

    if (!isAllowedDayPair(slot.days)) {
      return "Slots must use one allowed day pair: Mon-Thu, Tue-Fri, Wed-Sat, or Sat-Sun";
    }

    if (!["demo", "enrolled"].includes(slot.slotType)) {
      return "Invalid slotType; must be 'demo' or 'enrolled'";
    }

    if (!["standard", "premium"].includes(slot.sessionType)) {
      return "Invalid sessionType; must be 'standard' or 'premium'";
    }

    const expectedDuration = getExpectedDurationMinutes(slot);
    const start = timeToMinutes(slot.startTime);
    const end = timeToMinutes(slot.endTime);

    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
      return `Invalid time range for ${slot.startTime}-${slot.endTime}`;
    }

    if (!expectedDuration || end - start !== expectedDuration) {
      return slot.slotType === "demo"
        ? "Demo slots must be exactly 20 minutes"
        : slot.sessionType === "premium"
          ? "Individual class slots must be exactly 40 minutes"
          : "Group class slots must be exactly 60 minutes";
    }

    if (!slot.branchId) continue;

    const branch = await Branch.findById(slot.branchId).select(
      "branchName branchTimings branchOpenDays"
    );
    if (!branch) return `Branch not found. ${IT_SUPPORT_HINT}`;

    if (Array.isArray(branch.branchOpenDays) && branch.branchOpenDays.length > 0) {
      const openDays = branch.branchOpenDays.map((d) => d.toLowerCase());
      for (const day of slot.days) {
        if (!openDays.includes(String(day).toLowerCase())) {
          return `${branch.branchName} is not open on ${day}. Open days: ${branch.branchOpenDays.join(", ")}. ${IT_SUPPORT_HINT}`;
        }
      }
    }

    if (Array.isArray(branch.branchTimings) && branch.branchTimings.length === 2) {
      const branchOpen = parseTimeToMinutes(branch.branchTimings[0]);
      const branchClose = parseTimeToMinutes(branch.branchTimings[1]);
      if (Number.isFinite(branchOpen) && Number.isFinite(branchClose)) {
        if (start < branchOpen || end > branchClose) {
          return `Slot ${slot.startTime}–${slot.endTime} is outside ${branch.branchName} open hours (${branch.branchTimings[0]}–${branch.branchTimings[1]}). ${IT_SUPPORT_HINT}`;
        }
      }
    }
  }

  return null;
};

// Same-type time clashes across one week. Demo and enrolled may overlap (the
// teacher is at the branch anyway), and two offline courses may share a window
// at one centre (different rooms). Returns an error message or null.
const findAvailabilityOverlap = ({ entries = [], baseEntries = [] } = {}) => {
  const byDay = {};

  const push = (slot) => {
    for (const day of slot.days) {
      const key = String(day).toLowerCase();
      if (!byDay[key]) byDay[key] = [];
      byDay[key].push({
        start: timeToMinutes(slot.startTime),
        end: timeToMinutes(slot.endTime),
        slotType: slot.slotType,
        sessionType: slot.sessionType,
        courseId: slot.courseId,
        branchId: slot.branchId,
      });
    }
  };

  for (const slot of baseEntries) push(slot);

  for (const slot of entries) {
    const start = timeToMinutes(slot.startTime);
    const end = timeToMinutes(slot.endTime);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
      return `Invalid time range for ${slot.startTime}-${slot.endTime}`;
    }

    for (const day of slot.days) {
      const key = String(day).toLowerCase();
      for (const existing of byDay[key] || []) {
        if (existing.slotType && existing.slotType !== slot.slotType) continue;
        const bothOffline = !!slot.branchId && !!existing.branchId;
        if (
          bothOffline &&
          slot.courseId &&
          existing.courseId &&
          String(slot.courseId) !== String(existing.courseId)
        ) {
          continue;
        }
        if (start < existing.end && end > existing.start) {
          return `Overlap detected on ${key} between ${slot.startTime}-${slot.endTime}`;
        }
      }
    }

    push(slot);
  }

  return null;
};

module.exports = {
  SLOT_DURATION_RULES,
  DAY_PAIR_OPTIONS,
  ALLOWED_DAY_PAIRS,
  IT_SUPPORT_HINT,
  getExpectedDurationMinutes,
  isAllowedDayPair,
  getDayPairLabel,
  timeToMinutes,
  parseTimeToMinutes,
  availabilitySignature,
  scheduleSnapshot,
  sameSchedule,
  resolveAvailabilityEntries,
  validateAvailabilityEntries,
  findAvailabilityOverlap,
};
