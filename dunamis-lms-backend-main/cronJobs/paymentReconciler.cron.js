const { scheduleWithHeartbeat } = require("../utils/cronHeartbeat");
const { reconcilePayments } = require("../services/paymentReconciler");

// 06:00 / 12:00 / 18:00 / 00:00 IST = 00:30 / 06:30 / 12:30 / 18:30 UTC.
// Six hours means a stranded payment is caught within one business half-day;
// the 2026-07-12 incident ran for days.
scheduleWithHeartbeat("paymentReconciler", "30 0,6,12,18 * * *", reconcilePayments, {
  intervalHours: 6,
});

module.exports = { reconcilePayments };
