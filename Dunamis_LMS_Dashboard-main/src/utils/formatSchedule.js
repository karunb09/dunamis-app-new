const DAY_LABELS = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

const DAY_ORDER = Object.keys(DAY_LABELS);

const to12Hour = (value) => {
  const time = String(value || "").trim();
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const hour = Number(hours);
  if (Number.isNaN(hour)) return time;
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${period}`;
};

export const formatScheduleDays = (schedule) => {
  const days = Array.isArray(schedule?.days) ? schedule.days : [];
  if (!days.length) return "";
  return days
    .slice()
    .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
    .map((day) => DAY_LABELS[day] || day)
    .join(", ");
};

export const formatScheduleTime = (schedule) => {
  if (!schedule?.startTime || !schedule?.endTime) return "";
  return `${to12Hour(schedule.startTime)} – ${to12Hour(schedule.endTime)}`;
};

export const formatScheduleLabel = (schedule) => {
  const days = formatScheduleDays(schedule);
  const time = formatScheduleTime(schedule);
  if (!days && !time) return "Schedule not set";
  if (days && time) return `${days} · ${time}`;
  return days || time;
};

export const formatSessionType = (schedule) =>
  schedule?.sessionType === "premium" ? "Individual" : "Group";
