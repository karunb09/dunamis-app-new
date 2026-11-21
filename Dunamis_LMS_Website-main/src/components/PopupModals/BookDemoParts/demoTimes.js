import { formatTimeLabel } from "@/helpers/courseSlots";

const IST_MS = 5.5 * 60 * 60 * 1000;

// Slot dates are IST calendar days; read them in IST whatever the visitor's
// own timezone is.
export const istDayKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() + IST_MS).toISOString().slice(0, 10);
};

const nowInIst = () => {
  const now = new Date(Date.now() + IST_MS);
  return {
    dayKey: now.toISOString().slice(0, 10),
    minutes: now.getUTCHours() * 60 + now.getUTCMinutes(),
  };
};

// Accepts "17:00", "1700" and "5:00 PM".
export const toMinutes = (time) => {
  const raw = String(time || "").trim();
  if (!raw) return -1;
  const meridiem = raw.match(/\s*(AM|PM)$/i)?.[1]?.toUpperCase();
  const clock = raw.replace(/\s*(AM|PM)$/i, "");
  let hours;
  let minutes;
  if (clock.includes(":")) {
    [hours, minutes] = clock.split(":").map(Number);
  } else {
    const digits = clock.replace(/\D/g, "");
    if (!digits) return -1;
    hours = Number(digits.length <= 2 ? digits : digits.slice(0, -2));
    minutes = digits.length <= 2 ? 0 : Number(digits.slice(-2));
  }
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return -1;
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

// Future slots only, one per start/end time per day (an instructor can have
// generated duplicates), ordered by day then time.
export const upcomingSlots = (slots = []) => {
  const { dayKey: today, minutes: nowMinutes } = nowInIst();
  const seen = new Set();
  return slots
    .map((slot) => ({
      ...slot,
      dayKey: istDayKey(slot.date),
      startMinutes: toMinutes(slot.startTime),
    }))
    .filter((slot) => {
      if (!slot.dayKey || slot.dayKey < today) return false;
      if (slot.dayKey === today && slot.startMinutes <= nowMinutes) return false;
      const key = `${slot.dayKey}|${slot.startMinutes}|${toMinutes(slot.endTime)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.dayKey.localeCompare(b.dayKey) || a.startMinutes - b.startMinutes);
};

export const groupByDay = (slots = []) => {
  const days = new Map();
  slots.forEach((slot) => {
    if (!days.has(slot.dayKey)) days.set(slot.dayKey, []);
    days.get(slot.dayKey).push(slot);
  });
  return days;
};

const dayKeyToDate = (dayKey) => new Date(`${dayKey}T00:00:00Z`);

const addDays = (dayKey, count) => {
  const date = dayKeyToDate(dayKey);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
};

export const dayName = (dayKey) => {
  const today = nowInIst().dayKey;
  if (dayKey === today) return "Today";
  if (dayKey === addDays(today, 1)) return "Tomorrow";
  return dayKeyToDate(dayKey).toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" });
};

export const dayDate = (dayKey) =>
  dayKeyToDate(dayKey).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

// "Today", "Tomorrow" or "Sat 22 Nov".
export const dayLabel = (dayKey) => {
  const name = dayName(dayKey);
  return name === "Today" || name === "Tomorrow" ? name : `${name} ${dayDate(dayKey)}`;
};

export const timeLabel = (slot) => formatTimeLabel(slot?.startTime);

export const slotLabel = (slot) => (slot ? `${dayLabel(slot.dayKey)}, ${timeLabel(slot)}` : "");

export const durationMinutes = (slot) => {
  const start = toMinutes(slot?.startTime);
  const end = toMinutes(slot?.endTime);
  return start >= 0 && end > start ? end - start : null;
};

export const PARTS_OF_DAY = [
  { key: "morning", label: "Morning", until: 12 * 60 },
  { key: "afternoon", label: "Afternoon", until: 17 * 60 },
  { key: "evening", label: "Evening", until: 24 * 60 },
];

export const partOfDay = (minutes) =>
  PARTS_OF_DAY.find((part) => minutes < part.until)?.key || "evening";
