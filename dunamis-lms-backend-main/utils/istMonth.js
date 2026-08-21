// India has no DST, so a fixed +05:30 offset is exact for month bucketing.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const IST_TZ_OFFSET = "+05:30";

const pad2 = (n) => String(n).padStart(2, "0");

const monthKeyFromDate = (date) => {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return `${ist.getUTCFullYear()}-${pad2(ist.getUTCMonth() + 1)}`;
};

const currentMonthKey = () => monthKeyFromDate(new Date());

const isValidMonthKey = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value || ""));

// UTC instants that bound the IST calendar month, e.g. "2026-07" ->
// [2026-06-30T18:30:00Z, 2026-07-31T18:30:00Z).
const monthWindow = (monthKey) => {
  const [year, month] = monthKey.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, month - 1, 1) - IST_OFFSET_MS),
    end: new Date(Date.UTC(year, month, 1) - IST_OFFSET_MS),
  };
};

// UTC instant of IST 00:00 on a YYYY-MM-DD calendar date. Date-only filter
// values mean an IST calendar day, not a UTC one — parsing "2026-08-07" as a
// plain Date yields UTC midnight, which is 05:30 IST and silently drops the
// first 5.5 hours of the day.
const istDayStart = (dayKey) => {
  const [year, month, day] = String(dayKey).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) - IST_OFFSET_MS);
};

// Exclusive upper bound for an inclusive IST end date: start of the next day.
const istDayEndExclusive = (dayKey) => {
  const [year, month, day] = String(dayKey).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1) - IST_OFFSET_MS);
};

const dayWindow = (dayKey) => ({
  start: istDayStart(dayKey),
  end: istDayEndExclusive(dayKey),
});

const dayKeyFromDate = (date) => {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return `${ist.getUTCFullYear()}-${pad2(ist.getUTCMonth() + 1)}-${pad2(ist.getUTCDate())}`;
};

const currentDayKey = () => dayKeyFromDate(new Date());

const isValidDayKey = (value) =>
  /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(String(value || ""));

// Date.UTC normalises out-of-range days, so month/year rollover is free.
const shiftDay = (dayKey, delta) => {
  const [year, month, day] = dayKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + delta));
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(
    shifted.getUTCDate()
  )}`;
};

const dayLabel = (dayKey) => {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

const shiftMonth = (monthKey, delta) => {
  const [year, month] = monthKey.split("-").map(Number);
  const total = year * 12 + (month - 1) + delta;
  const shiftedYear = Math.floor(total / 12);
  const shiftedMonth = (total % 12) + 1;
  return `${shiftedYear}-${pad2(shiftedMonth)}`;
};

// Oldest -> newest, length = count, ending at (and including) monthKey.
const monthKeysEndingAt = (monthKey, count) => {
  const keys = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    keys.push(shiftMonth(monthKey, -i));
  }
  return keys;
};

const monthLabel = (monthKey) => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

module.exports = {
  IST_OFFSET_MS,
  IST_TZ_OFFSET,
  monthKeyFromDate,
  currentMonthKey,
  isValidMonthKey,
  monthWindow,
  istDayStart,
  istDayEndExclusive,
  dayWindow,
  dayKeyFromDate,
  currentDayKey,
  isValidDayKey,
  shiftDay,
  dayLabel,
  shiftMonth,
  monthKeysEndingAt,
  monthLabel,
};
