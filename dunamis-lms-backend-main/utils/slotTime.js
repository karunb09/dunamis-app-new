const { IST_OFFSET_MS } = require("./istMonth");
const { parseTimeMinutes } = require("./classRoster");

// The exact UTC instant a slot begins.
//
// Slot.date is written with setHours(0,0,0,0) in the *server's* local zone
// (utils/syncAvailabilitySlots.js), so reading the calendar fields back with
// the local getters round-trips to the day that was intended no matter what TZ
// the host runs in. startTime is always an IST wall-clock string, so the day is
// then anchored to IST rather than to the host.
//
// classRoster.js's slotStartAt combines the two in local time instead. That is
// harmless for its ordering guards, but a reminder that has to fire fifteen
// minutes before a class cannot absorb a 5h30m error.
const slotStartInstant = (slot) => {
  const date = slot?.date instanceof Date ? slot.date : new Date(slot?.date);
  const dayStartUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return new Date(dayStartUtc - IST_OFFSET_MS + parseTimeMinutes(slot?.startTime) * 60000);
};

const minutesUntilSlot = (slot, now = new Date()) =>
  (slotStartInstant(slot) - now) / 60000;

module.exports = { slotStartInstant, minutesUntilSlot };
