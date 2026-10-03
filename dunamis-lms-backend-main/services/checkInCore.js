// What instructor and staff branch check-in share: the geofence, the location
// reading stored on a visit, admin corrections and report ranges.
const { parseTimeMinutes } = require("../utils/classRoster");
const { DEFAULT_GEOFENCE_RADIUS_M, haversineMeters, hasPin } = require("../utils/geo");
const { istDayStart, shiftDay, shiftMonth } = require("../utils/istMonth");

// A reading's own margin of error gets the benefit of the doubt up to 100 m —
// indoor fixes are often ±50–80 m — but a ±500 m fix proves nothing.
const ACCURACY_ALLOWANCE_CAP_M = 100;
const MAX_ACCURACY_M = 500;
// This long after a visit was expected to end, a check-out counts as a late
// logout, the reminder goes out, and the check-out may be made from anywhere.
const LATE_CHECKOUT_AFTER_MS = 30 * 60 * 1000;
const NO_CLASS_FALLBACK_MS = 3 * 60 * 60 * 1000;
const MAX_REPORT_DAYS = 62;

const fail = (statusCode, message, extra = {}) =>
  Object.assign(new Error(message), { statusCode, ...extra });

const toId = (value) => String(value?._id || value || "");

const minutesCeil = (ms) => Math.ceil(ms / 60000);

const formatIstTime = (value) =>
  new Date(value).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

const formatDistance = (metres) =>
  metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${Math.round(metres)} m`;

const weakSignal = (accuracyM) =>
  fail(
    422,
    `Your location is too imprecise (±${Math.round(accuracyM)} m). Turn on precise location, step near a window and try again.`,
    { details: { accuracyM } }
  );

const evaluateGeofence = (branch, { lat, lng, accuracyM }) => {
  if (!hasPin(branch?.geo)) return { distanceM: null, radiusM: null, withinRadius: null };
  const radiusM = branch.geofenceRadiusM || DEFAULT_GEOFENCE_RADIUS_M;
  const distanceM = Math.round(haversineMeters(branch.geo, { lat, lng }));
  const allowance = Math.min(accuracyM, ACCURACY_ALLOWANCE_CAP_M);
  return { distanceM, radiusM, withinRadius: distanceM - allowance <= radiusM };
};

const outsideRadius = (branch, fence, accuracyM, advice) =>
  fail(422, `You are ${formatDistance(fence.distanceM)} from ${branch.branchName}. ${advice}`, {
    details: { distanceM: fence.distanceM, radiusM: fence.radiusM, accuracyM },
  });

const buildFix = (fix, now, fence) => ({
  at: now,
  lat: fix.lat,
  lng: fix.lng,
  accuracyM: fix.accuracyM,
  distanceM: fence.distanceM,
  withinRadius: fence.withinRadius,
  deviceTime: fix.deviceTime || null,
  userAgent: fix.userAgent || "",
});

// With nothing scheduled to end against, the branch's closing time stands in —
// or three hours on, if that string is unreadable.
const fallbackCheckOutAt = (branch, dayKey, checkInAt) => {
  const closeMinutes = parseTimeMinutes(branch?.branchTimings?.[1]);
  const close = new Date(istDayStart(dayKey).getTime() + closeMinutes * 60000);
  return closeMinutes && close > checkInAt
    ? close
    : new Date(checkInAt.getTime() + NO_CLASS_FALLBACK_MS);
};

const latestCorrection = (visit) =>
  [...(visit.adminNotes || [])].reverse().find((note) => note.correctedCheckOutAt)
    ?.correctedCheckOutAt || null;

const describeNotes = (notes = [], nameOf) =>
  notes.map((note) => ({
    note: note.note,
    correctedCheckOutAt: note.correctedCheckOutAt,
    at: note.at,
    by: nameOf(note.by),
  }));

// who names the person in the refusal ("The instructor", "They").
const assertCorrectionAllowed = ({ visit, correctedCheckOutAt, now, todayKey, who }) => {
  if (!correctedCheckOutAt) return;
  const corrected = new Date(correctedCheckOutAt);
  const checkInAt = new Date(visit.checkIn.at);
  if (visit.status === "open" && visit.dayKey === todayKey) {
    throw fail(
      409,
      `${who} is still checked in. Add a corrected time once they check out or the day ends.`
    );
  }
  if (corrected <= checkInAt) {
    throw fail(400, "The corrected check-out must be after the check-in time.");
  }
  if (corrected - checkInAt > 24 * 60 * 60 * 1000) {
    throw fail(400, "The corrected check-out must be within 24 hours of the check-in.");
  }
  if (corrected > now) throw fail(400, "The corrected check-out can't be in the future.");
};

const daysBetween = (from, to) =>
  Math.round((istDayStart(to) - istDayStart(from)) / 86400000) + 1;

const resolveRange = ({ from, to, todayKey }) => {
  const rangeFrom = from || todayKey;
  const rangeTo = to || rangeFrom;
  if (rangeFrom > rangeTo) throw fail(400, "The start date must be on or before the end date.");
  if (daysBetween(rangeFrom, rangeTo) > MAX_REPORT_DAYS) {
    throw fail(400, `Pick a range of ${MAX_REPORT_DAYS} days or fewer.`);
  }
  return { rangeFrom, rangeTo };
};

const monthRange = (month) => ({
  from: `${month}-01`,
  to: shiftDay(`${shiftMonth(month, 1)}-01`, -1),
});

module.exports = {
  LATE_CHECKOUT_AFTER_MS,
  MAX_ACCURACY_M,
  MAX_REPORT_DAYS,
  assertCorrectionAllowed,
  buildFix,
  daysBetween,
  describeNotes,
  evaluateGeofence,
  fail,
  fallbackCheckOutAt,
  formatDistance,
  formatIstTime,
  latestCorrection,
  minutesCeil,
  monthRange,
  outsideRadius,
  resolveRange,
  toId,
  weakSignal,
};
