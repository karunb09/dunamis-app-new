const asyncHandler = require("../utils/asyncHandler");
const checkIns = require("../services/instructorCheckIn");
const InstructorCheckIn = require("../model/instructorCheckIn.model");
const { getScope } = require("../middleware/auth");
const { isInScope, notFound } = require("../utils/scopeFilters");

const fixFrom = (req) => ({
  lat: req.body.lat,
  lng: req.body.lng,
  accuracyM: req.body.accuracyM,
  deviceTime: req.body.deviceTime || null,
  userAgent: String(req.get("user-agent") || "").slice(0, 300),
});

exports.getMyToday = asyncHandler(async (req, res) => {
  const teacherId = await checkIns.teacherIdForUser(req.user.userId);
  res.status(200).json(await checkIns.getTeacherToday({ teacherId }));
});

exports.getMyHistory = asyncHandler(async (req, res) => {
  const teacherId = await checkIns.teacherIdForUser(req.user.userId);
  const { month } = req.validated.query;
  res.status(200).json(await checkIns.getTeacherHistory({ teacherId, month }));
});

exports.checkIn = asyncHandler(async (req, res) => {
  const teacherId = await checkIns.teacherIdForUser(req.user.userId);
  const visit = await checkIns.checkIn({
    teacherId,
    branchId: req.body.branchId,
    fix: fixFrom(req),
  });
  res.status(201).json({ success: true, visit });
});

exports.checkOut = asyncHandler(async (req, res) => {
  const teacherId = await checkIns.teacherIdForUser(req.user.userId);
  const visit = await checkIns.checkOut({
    teacherId,
    visitId: req.params.id,
    fix: fixFrom(req),
  });
  res.status(200).json({ success: true, visit });
});

exports.getCheckInReport = asyncHandler(async (req, res) => {
  const { from, to, teacherId, branchId } = req.validated.query;
  // Branch visits are offline-only, so a scoped admin's area is its branches.
  const area = await getScope(req);
  if (area && branchId && !isInScope(area, { branchId })) return notFound(res, "Branch");
  res.status(200).json(
    await checkIns.buildCheckInReport({ from, to, teacherId, branchId, branchIds: area?.branchIds || null })
  );
});

exports.addCheckInNote = asyncHandler(async (req, res) => {
  const area = await getScope(req);
  if (area) {
    const visit = await InstructorCheckIn.findById(req.params.id).select("branchId").lean();
    if (!visit || !isInScope(area, { branchId: visit.branchId })) return notFound(res, "Check-in");
  }
  const visit = await checkIns.addAdminNote({
    visitId: req.params.id,
    userId: req.user.userId,
    note: req.body.note,
    correctedCheckOutAt: req.body.correctedCheckOutAt || null,
  });
  res.status(200).json({ success: true, visit });
});
