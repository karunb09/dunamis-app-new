const asyncHandler = require("../utils/asyncHandler");
const staffCheckIns = require("../services/staffCheckIn");
const StaffCheckIn = require("../model/staffCheckIn.model");
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
  res.status(200).json(await staffCheckIns.getStaffToday({ userId: req.user.userId }));
});

exports.getMyHistory = asyncHandler(async (req, res) => {
  const { month } = req.validated.query;
  res.status(200).json(await staffCheckIns.getStaffHistory({ userId: req.user.userId, month }));
});

exports.checkIn = asyncHandler(async (req, res) => {
  const visit = await staffCheckIns.checkIn({
    userId: req.user.userId,
    branchId: req.body.branchId,
    fix: fixFrom(req),
  });
  res.status(201).json({ success: true, visit });
});

exports.checkOut = asyncHandler(async (req, res) => {
  const visit = await staffCheckIns.checkOut({
    userId: req.user.userId,
    visitId: req.params.id,
    fix: fixFrom(req),
  });
  res.status(200).json({ success: true, visit });
});

exports.getStaffCheckInReport = asyncHandler(async (req, res) => {
  const { from, to, userId, branchId } = req.validated.query;
  // Branch visits are offline-only, so a scoped admin's area is its branches.
  const area = await getScope(req);
  if (area && branchId && !isInScope(area, { branchId })) return notFound(res, "Branch");
  res.status(200).json(
    await staffCheckIns.buildStaffCheckInReport({
      from,
      to,
      userId,
      branchId,
      branchIds: area?.branchIds || null,
    })
  );
});

exports.addStaffCheckInNote = asyncHandler(async (req, res) => {
  const area = await getScope(req);
  if (area) {
    const visit = await StaffCheckIn.findById(req.params.id).select("branchId").lean();
    if (!visit || !isInScope(area, { branchId: visit.branchId })) return notFound(res, "Check-in");
  }
  const visit = await staffCheckIns.addStaffNote({
    visitId: req.params.id,
    userId: req.user.userId,
    note: req.body.note,
    correctedCheckOutAt: req.body.correctedCheckOutAt || null,
  });
  res.status(200).json({ success: true, visit });
});
