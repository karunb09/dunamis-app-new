const DAY_LABELS = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

// ["monday", "thursday"] → "Mon · Thu"
export const formatDays = (days = []) =>
  days.map((d) => DAY_LABELS[String(d).toLowerCase()] || d).join(" · ");
