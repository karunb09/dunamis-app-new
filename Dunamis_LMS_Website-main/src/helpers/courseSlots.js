import { resolveImageUrl } from "@/lib/resolveImageUrl";

const DAY_ORDER = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

const isObjectIdLike = (value) =>
  typeof value === "string" && OBJECT_ID_PATTERN.test(value.trim());

const toDisplayText = (value) => {
  const text = String(value || "").trim();
  return isObjectIdLike(text) ? "" : text;
};

export const normalizeEntityId = (value) => {
  if (!value && value !== 0) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return String(
    value._id ||
      value.id ||
      value.value ||
      value.teacherId ||
      value.branchId ||
      value.userId ||
      ""
  );
};

export const normalizeMode = (value) => {
  const mode = String(value || "").trim().toLowerCase();
  return mode === "offline" ? "offline" : mode === "online" ? "online" : "";
};

export const normalizeCityName = (value) => {
  if (!value && value !== 0) return "";

  if (typeof value === "string" || typeof value === "number") {
    return toDisplayText(value);
  }

  return toDisplayText(value.cityName || value.name || value.label || "");
};

const normalizeSlotType = (value) =>
  String(value || "").trim().toLowerCase();

const normalizeDays = (days = []) =>
  (Array.isArray(days) ? days : [])
    .map((day) => String(day || "").trim().toLowerCase())
    .filter(Boolean);

export const buildTeacherName = (teacher) => {
  const structuredName =
    teacher?.teacherDetail?.name ||
    teacher?.userId?.name ||
    teacher?.name ||
    null;

  if (typeof structuredName === "string" && structuredName.trim()) {
    return structuredName.trim();
  }

  const firstName = structuredName?.firstName || "";
  const lastName = structuredName?.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || "Instructor";
};

export const formatTimeLabel = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "Time TBD";
  if (raw === "24:00") return "12:00 AM";
  if (/\b(AM|PM)\b/i.test(raw)) return raw.toUpperCase();

  const parts = raw.split(":");
  if (parts.length === 2) {
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);

    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      const hour12 = ((hours + 11) % 12) + 1;
      const ampm = hours < 12 ? "AM" : "PM";
      return `${hour12}:${String(minutes).padStart(2, "0")} ${ampm}`;
    }
  }

  const clean = raw.replace(/\D/g, "");
  if (clean.length < 3) return raw;

  const hours = Number(clean.slice(0, clean.length - 2));
  const minutes = Number(clean.slice(-2));

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return raw;

  const hour12 = ((hours + 11) % 12) + 1;
  const ampm = hours < 12 ? "AM" : "PM";
  return `${hour12}:${String(minutes).padStart(2, "0")} ${ampm}`;
};

export const formatDateLabel = (value) => {
  if (!value) return "Date TBD";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Date TBD";

  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

const buildSlotSortKey = (slot) => {
  const date = slot?.date ? new Date(slot.date) : null;
  const fallbackDayRank = DAY_ORDER.indexOf(String(slot?.day || "").trim());
  const dayRank =
    date && !Number.isNaN(date.getTime())
      ? date.getTime()
      : fallbackDayRank === -1
        ? Number.MAX_SAFE_INTEGER
        : fallbackDayRank;

  return Number.isFinite(dayRank) ? dayRank : Number.MAX_SAFE_INTEGER;
};

const buildNormalizedSlot = (slot, branchLookup) => {
  const slotId = normalizeEntityId(slot);
  if (!slotId) return null;

  const branchId = normalizeEntityId(slot?.branchId);
  const branchLabel =
    toDisplayText(slot?.branchId?.branchName) ||
    toDisplayText(slot?.branchId?.name) ||
    branchLookup.get(branchId) ||
    "";
  const dateLabel = formatDateLabel(slot?.date);
  const startTime = slot?.startTime || "";
  const endTime = slot?.endTime || "";
  const deliveryMode = branchId ? "offline" : "online";
  const studentCount = Array.isArray(slot?.students)
    ? slot.students.length
    : Number(slot?.studentCount) || 0;
  const maxStudents =
    Number(slot?.maxStudents) ||
    (slot?.slotType === "demo"
      ? 1
      : slot?.sessionType === "premium"
        ? 1
        : deliveryMode === "offline"
          ? 9999
          : 5);
  const bookingTag =
    slot?.bookingTag ||
    (slot?.slotType === "enrolled" &&
    slot?.sessionType === "standard" &&
    deliveryMode !== "offline"
      ? studentCount >= 3
        ? "Filling fast"
        : studentCount >= 1
          ? "Learner's choice"
          : ""
      : "");
  const recurringDays = normalizeDays(slot?.recurringDays);
  const availabilityDays = normalizeDays(slot?.availabilityDays);

  return {
    id: slotId,
    slotId,
    label: `${dateLabel} | ${formatTimeLabel(startTime)} - ${formatTimeLabel(
      endTime
    )}`,
    date: slot?.date || null,
    startTime,
    endTime,
    sessionType: slot?.sessionType || null,
    slotType: normalizeSlotType(slot?.slotType) || null,
    studentCount,
    maxStudents,
    availableSeats:
      slot?.availableSeats ??
      (maxStudents >= 9999 ? null : Math.max(maxStudents - studentCount, 0)),
    bookingTag,
    recurringDays,
    availabilityDays,
    dayPairLabel: slot?.dayPairLabel || "",
    branchId: branchId || null,
    branchLabel,
    teacherId: normalizeEntityId(
      slot?.createdBy || slot?.teacherId || slot?.teacher || slot?.instructorId
    ),
    deliveryMode,
    raw: slot,
  };
};

export const buildBranchOptions = (course, slots = []) => {
  const map = new Map();

  const upsertBranch = (id, label, city, raw) => {
    const displayLabel = toDisplayText(label);
    const displayCity = normalizeCityName(city);
    if (!id || !displayLabel) return;

    const existing = map.get(id);
    if (!existing) {
      map.set(id, { id, label: displayLabel, city: displayCity, raw });
      return;
    }

    map.set(id, {
      ...existing,
      label: existing.label || displayLabel,
      city: existing.city || displayCity,
      raw: existing.raw || raw,
    });
  };

  (Array.isArray(course?.branches) ? course.branches : []).forEach((branch) => {
    const id = normalizeEntityId(branch);
    const label =
      toDisplayText(branch?.branchName) ||
      toDisplayText(branch?.name) ||
      toDisplayText(branch?.location);
    const city = normalizeCityName(branch?.city);
    upsertBranch(id, label, city, branch);
  });

  (Array.isArray(slots) ? slots : []).forEach((slot) => {
    const branch = slot?.branchId;
    const id = normalizeEntityId(branch);
    const label =
      toDisplayText(branch?.branchName) ||
      toDisplayText(branch?.name) ||
      toDisplayText(branch?.location);
    const city = normalizeCityName(branch?.city);
    upsertBranch(id, label, city, branch);
  });

  return Array.from(map.values());
};

export const buildBranchSummary = (branches = [], max = 2) => {
  const names = (Array.isArray(branches) ? branches : [])
    .map((branch) => toDisplayText(branch?.branchName) || toDisplayText(branch?.name))
    .filter(Boolean);

  if (names.length === 0) return null;
  if (names.length === 1) return names[0];
  if (names.length <= max) return names.join(" & ");
  return `${names.slice(0, max).join(", ")} +${names.length - max} more`;
};

export const buildInstructorOptions = (
  course,
  slots = [],
  slotType,
  { includeWithoutSlots = false } = {}
) => {
  const normalizedSlotType = normalizeSlotType(slotType);
  const branchOptions = buildBranchOptions(course, slots);
  const branchLookup = new Map(branchOptions.map((branch) => [branch.id, branch.label]));

  const teacherMeta = new Map();
  (Array.isArray(course?.teacher) ? course.teacher : []).forEach((teacher) => {
    const id = normalizeEntityId(teacher);
    if (!id) return;

    teacherMeta.set(id, {
      id,
      name: buildTeacherName(teacher),
      profilePicture: resolveImageUrl(
        teacher?.teacherDetail?.profilePicture || teacher?.userId?.image || "",
        ""
      ),
      profileVideo: resolveImageUrl(
        teacher?.teacherDetail?.profileVideo || teacher?.profileVideo || "",
        ""
      ),
      averageRating: teacher?.averageRating || 0,
      teachLanguages:
        teacher?.teacherDetail?.teachLanguages ||
        teacher?.teacherDetail?.language?.teach ||
        [],
      mode:
        normalizeMode(teacher?.teacherDetail?.mode) ||
        normalizeMode(teacher?.mode) ||
        normalizeMode(course?.mode) ||
        "online",
      slots: [],
    });
  });

  const hasAssignedTeachers = teacherMeta.size > 0;

  (Array.isArray(slots) ? slots : []).forEach((slot) => {
    if (normalizedSlotType && normalizeSlotType(slot?.slotType) !== normalizedSlotType) {
      return;
    }

    const teacherSource =
      slot?.createdBy || slot?.teacherId || slot?.teacher || slot?.instructorId;
    const teacherId = normalizeEntityId(teacherSource);
    if (!teacherId) return;
    if (hasAssignedTeachers && !teacherMeta.has(teacherId)) return;

    const normalizedSlot = buildNormalizedSlot(slot, branchLookup);
    if (!normalizedSlot) return;

    const existing = teacherMeta.get(teacherId) || {
      id: teacherId,
      name: buildTeacherName(teacherSource),
      profilePicture: resolveImageUrl(
        teacherSource?.userId?.image || teacherSource?.image || "",
        ""
      ),
      profileVideo: resolveImageUrl(
        teacherSource?.teacherDetail?.profileVideo ||
          teacherSource?.profileVideo ||
          "",
        ""
      ),
      averageRating: 0,
      mode: normalizedSlot.deliveryMode,
      slots: [],
    };

    existing.mode =
      normalizeMode(existing.mode) || normalizedSlot.deliveryMode || "online";
    existing.slots = [...existing.slots, normalizedSlot];
    teacherMeta.set(teacherId, existing);
  });

  return Array.from(teacherMeta.values())
    .map((teacher) => ({
      ...teacher,
      slots: teacher.slots
        .slice()
        .sort((a, b) => buildSlotSortKey(a) - buildSlotSortKey(b)),
    }))
    .filter((teacher) => includeWithoutSlots || teacher.slots.length > 0);
};

export const buildModeOptions = (course, slots = []) => {
  const modeSet = new Set();
  const courseMode = normalizeMode(course?.mode);
  if (courseMode) {
    modeSet.add(courseMode);
  }

  (Array.isArray(slots) ? slots : []).forEach((slot) => {
    modeSet.add(slot?.branchId ? "offline" : "online");
  });

  if (!modeSet.size) {
    modeSet.add("online");
  }

  return Array.from(modeSet);
};

export const filterSlotsForSelection = (
  slots = [],
  { deliveryMode = "", branchId = "", teacherId = "" } = {}
) => {
  const normalizedMode = normalizeMode(deliveryMode);
  const normalizedTeacherId = normalizeEntityId(teacherId);
  const normalizedBranchId = normalizeEntityId(branchId);

  return (Array.isArray(slots) ? slots : []).filter((slot) => {
    if (normalizedTeacherId && normalizeEntityId(slot.teacherId) !== normalizedTeacherId) {
      return false;
    }

    if (normalizedMode && normalizeMode(slot.deliveryMode) !== normalizedMode) {
      return false;
    }

    if (normalizedMode === "offline" && normalizedBranchId) {
      return normalizeEntityId(slot.branchId) === normalizedBranchId;
    }

    if (normalizedMode === "offline") {
      return Boolean(slot.branchId);
    }

    return true;
  });
};
