const asyncHandler = require("../utils/asyncHandler");
const { buildDailyAttendanceReport, summarizeClasses } = require("../services/attendanceReport");
const { getScope } = require("../middleware/auth");
const { isInScope } = require("../utils/scopeFilters");

// One payload, per-student rows included. A day tops out in the low hundreds of
// rows, so a separate drilldown endpoint would only cost a hook, a loading state
// and an incomplete export. If it ever grows, add ?students=0 rather than a route.
exports.getDailyAttendanceReport = asyncHandler(async (req, res) => {
  const { date, teacherId, courseId } = req.validated.query;
  const report = await buildDailyAttendanceReport({ dayKey: date, teacherId, courseId });

  // A scoped admin sees only their branches' and courses' classes, re-totalled.
  const area = await getScope(req);
  if (!area) return res.status(200).json(report);
  const classes = report.classes.filter((item) =>
    isInScope(area, { branchId: item.branchId, courseId: item.courseId })
  );
  res.status(200).json({ ...report, ...summarizeClasses(classes), classes });
});
