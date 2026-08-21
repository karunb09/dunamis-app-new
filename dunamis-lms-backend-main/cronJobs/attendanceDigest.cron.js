const { scheduleWithHeartbeat } = require("../utils/cronHeartbeat");
const { sendAttendanceDigest } = require("../services/attendanceDigest");

// 10:00 PM IST = 16:30 UTC. Errors are deliberately not caught here —
// scheduleWithHeartbeat records lastStatus: "error" and fires an ops alert,
// which an inner try/catch would silently defeat.
scheduleWithHeartbeat("attendanceDigest", "30 16 * * *", sendAttendanceDigest);

module.exports = { sendAttendanceDigest };
