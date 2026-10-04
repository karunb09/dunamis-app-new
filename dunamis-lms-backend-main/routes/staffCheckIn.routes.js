const express = require("express");
const router = express.Router();

const {
  isAuth,
  accessToRole,
  requireActiveStaff,
  requirePermission,
} = require("../middleware/auth");
const validate = require("../middleware/validate");
const { idParam } = require("../validators/common");
const {
  checkInSchema,
  checkOutSchema,
  checkInHistoryQuerySchema,
  checkInNoteSchema,
  staffCheckInReportQuerySchema,
} = require("../validators/instructorCheckIn.validator");
const {
  getMyToday,
  getMyHistory,
  checkIn,
  checkOut,
  getStaffCheckInReport,
  addStaffCheckInNote,
} = require("../controller/staffCheckIn.controller");

// Who may check in (AAs and BDEs at a branch) is decided in the service.
const staffOnly = [accessToRole(["admin", "superadmin"]), requireActiveStaff];
const reportViewers = [accessToRole(["admin", "superadmin"]), requirePermission("reports")];

// No update or delete routes: a visit is written by its check-in and closed by
// its check-out, and nothing else may change it. Admin corrections are notes.
router.get("/me/today", isAuth, ...staffOnly, getMyToday);
router.get("/me", isAuth, ...staffOnly, validate(checkInHistoryQuerySchema, "query"), getMyHistory);
router.post("/", isAuth, ...staffOnly, validate(checkInSchema), checkIn);
router.post(
  "/:id/check-out",
  isAuth,
  ...staffOnly,
  validate(idParam, "params"),
  validate(checkOutSchema),
  checkOut
);

router.get("/", isAuth, ...reportViewers, validate(staffCheckInReportQuerySchema, "query"), getStaffCheckInReport);
router.post(
  "/:id/notes",
  isAuth,
  ...reportViewers,
  validate(idParam, "params"),
  validate(checkInNoteSchema),
  addStaffCheckInNote
);

module.exports = router;
