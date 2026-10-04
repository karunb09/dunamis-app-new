import { formatDistance, formatTime } from "../../utils/checkInFormat";

// Rose = counts against the instructor (late login, early logout, missing
// logout); amber = worth a look; the rest is context.
export const visitFlags = (visit) => {
  const flags = visit.flags || {};
  const list = [];
  if (flags.lateCheckIn) {
    list.push({ key: "late", tone: "rose", label: `Late login +${flags.lateByMinutes}m` });
  }
  if (flags.earlyCheckOut) {
    list.push({ key: "early", tone: "rose", label: `Early logout −${flags.earlyByMinutes}m` });
  }
  if (visit.missingLogout) list.push({ key: "missing", tone: "rose", label: "Missing logout" });
  if (flags.lateCheckOut) list.push({ key: "lateOut", tone: "amber", label: "Late logout" });
  if (visit.checkOut?.offSite) {
    list.push({
      key: "offSite",
      tone: "amber",
      label: `Checked out ${formatDistance(visit.checkOut.distanceM)} away`,
    });
  }
  if (flags.locationUnverified) {
    list.push({ key: "unverified", tone: "slate", label: "Location unverified" });
  }
  if (flags.noScheduledClass) list.push({ key: "noClass", tone: "sky", label: "No class scheduled" });
  if (visit.correctedCheckOutAt) {
    list.push({
      key: "corrected",
      tone: "sky",
      label: `Admin: left ${formatTime(visit.correctedCheckOutAt)}`,
    });
  }
  return list;
};

// A staff member's day, judged at its two ends (see services/staffCheckIn.js):
// late against the first branch's opening, early against the last's closing.
export const dayFlags = (day) => {
  const list = [];
  if (day.lateCheckIn) {
    list.push({ key: "late", tone: "rose", label: `Late login +${day.lateByMinutes}m` });
  }
  if (day.earlyCheckOut) {
    list.push({ key: "early", tone: "rose", label: `Early logout −${day.earlyByMinutes}m` });
  }
  if (day.missingLogout) list.push({ key: "missing", tone: "rose", label: "Missing logout" });
  if (day.lateCheckOut) list.push({ key: "lateOut", tone: "amber", label: "Late logout" });
  if (day.offSite) list.push({ key: "offSite", tone: "amber", label: "Checked out off-site" });
  if (day.locationUnverified) {
    list.push({ key: "unverified", tone: "slate", label: "Location unverified" });
  }
  if (day.branchClosedToday) list.push({ key: "closed", tone: "sky", label: "Branch closed today" });
  if (day.lastOutCorrectedAt) {
    list.push({
      key: "corrected",
      tone: "sky",
      label: `Admin: left ${formatTime(day.lastOutCorrectedAt)}`,
    });
  }
  return list;
};
