// A one-off room change lives on the dated Slot; the standing room lives on
// the weekly ClassRoster, so it survives slot regeneration.
const resolveSlotJoinLink = (slot, roster) =>
  (slot?.meetingLinkOverride || roster?.meetingLink || "").trim();

module.exports = { resolveSlotJoinLink };
