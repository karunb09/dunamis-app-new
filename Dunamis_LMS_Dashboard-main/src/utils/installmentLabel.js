// Mirrors dunamis-lms-backend-main/utils/installmentLabel.js.
//
// A running course never ends, so "3 of 3" reads as "the course is finished".
// Those rows show the period paid for instead. Fixed courses keep the counter.
//
// When levels are enforced the running branch becomes
// `${monthsIntoTerm} of ${termMonths}` — six months per level. Changing it here
// changes every surface at once.
export const installmentLabel = (record) => {
  if (!record || record.paymentType === "Full") return null;
  if (record.courseType === "running") return null;

  const no = Number(record.installmentNo);
  const total = Number(record.installmentTotal);
  if (!no || !total) return null;

  return `${no} of ${total}`;
};

export const paymentPeriodLabel = (record) => {
  // A settled payment is described by when it was paid; an outstanding one by
  // when it falls due.
  const raw = record?.paidAt || record?.dueDate;
  const when = raw ? new Date(raw) : null;
  if (!when || Number.isNaN(when.getTime())) return "Monthly";
  return when.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
};

// One string for a column that only has room for one.
export const installmentSummary = (record) =>
  installmentLabel(record) || paymentPeriodLabel(record);

export const isRunning = (record) => record?.courseType === "running";
