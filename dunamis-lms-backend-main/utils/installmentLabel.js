// How an installment is described to a human.
//
// A running course has no finish line, so "3 of 3" is a lie that reads as
// "your course is over" — those surfaces show dates instead. Fixed courses
// keep the counter.
//
// When levels are enforced the running branch becomes
// `${monthsIntoTerm} of ${termMonths}` (six months per level), which is why
// termMonths is already snapshotted onto every payment. Changing it here
// changes it everywhere; no call site needs touching.
const installmentLabel = (record) => {
  if (!record || record.paymentType === "Full") return null;
  if (record.courseType === "running") return null;

  const no = Number(record.installmentNo);
  const total = Number(record.installmentTotal);
  if (!no || !total) return null;

  return `${no} of ${total}`;
};

// The line that replaces the counter on a running course.
const paymentPeriodLabel = (record, { locale = "en-IN" } = {}) => {
  // A settled payment is described by when it was paid; an outstanding one by
  // when it falls due.
  const raw = record?.paidAt || record?.dueDate;
  const when = raw ? new Date(raw) : null;
  if (!when || Number.isNaN(when.getTime())) return "Monthly";
  return `Month of ${when.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  })}`;
};

// One string for both shapes, for surfaces that only have room for one.
const installmentSummary = (record) =>
  installmentLabel(record) || paymentPeriodLabel(record);

module.exports = { installmentLabel, paymentPeriodLabel, installmentSummary };
