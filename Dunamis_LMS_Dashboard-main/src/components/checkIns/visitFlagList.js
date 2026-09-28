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
