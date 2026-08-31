// Mirrors dunamis-lms-backend-main/utils/installmentLabel.js.
//
// A running course never ends, so a "3 of 3" counter — and the progress bar
// that fills alongside it — tells the student their course is over when it is
// not. Those surfaces show the period paid for, and what is paid through.
//
// When levels are enforced the running branch becomes
// `${monthsIntoTerm} of ${termMonths}` (six months per level).
export const isRunning = (record) => record?.courseType === "running";

export const installmentLabel = (record) => {
  if (!record || record.paymentType === "Full") return null;
  if (isRunning(record)) return null;

  const no = Number(record.installmentNo);
  const total = Number(record.installmentTotal);
  if (!no || !total) return null;

  return `${no} of ${total}`;
};

export const paymentPeriodLabel = (record) => {
  const raw = record?.paidAt || record?.dueDate;
  const when = raw ? new Date(raw) : null;
  if (!when || Number.isNaN(when.getTime())) return "Monthly";
  return when.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

export const installmentSummary = (record) =>
  installmentLabel(record) || paymentPeriodLabel(record);
