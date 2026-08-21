const asyncHandler = require("../utils/asyncHandler");
const { buildDailyAttendanceReport } = require("../services/attendanceReport");

// One payload, per-student rows included. A day tops out in the low hundreds of
// rows, so a separate drilldown endpoint would only cost a hook, a loading state
// and an incomplete export. If it ever grows, add ?students=0 rather than a route.
exports.getDailyAttendanceReport = asyncHandler(async (req, res) => {
  const { date, teacherId, courseId } = req.validated.query;
  const report = await buildDailyAttendanceReport({ dayKey: date, teacherId, courseId });
  res.status(200).json(report);
});
