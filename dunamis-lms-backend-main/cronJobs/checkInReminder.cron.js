const { scheduleWithHeartbeat } = require("../utils/cronHeartbeat");
const { sendCheckInReminders } = require("../services/checkInReminder");

// Every 5 minutes: a missing check-in is chased at the first tick after the
// class starts, a forgotten check-out 30 minutes after the last class ends.
// intervalHours is fractional so the ops page flags a stall in minutes.
scheduleWithHeartbeat("checkInReminder", "*/5 * * * *", () => sendCheckInReminders(), {
  intervalHours: 0.25,
});

module.exports = { sendCheckInReminders };
