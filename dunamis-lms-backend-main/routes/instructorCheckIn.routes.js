const express = require("express");
const router = express.Router();

const { isAuth, accessToRole, requirePermission } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { idParam } = require("../validators/common");
const {
  checkInSchema,
  checkOutSchema,
  checkInReportQuerySchema,
  checkInHistoryQuerySchema,
  checkInNoteSchema,
} = require("../validators/instructorCheckIn.validator");
const {
  getMyToday,
  getMyHistory,
  checkIn,
  checkOut,
  getCheckInReport,
  addCheckInNote,
} = require("../controller/instructorCheckIn.controller");

const teacherOnly = accessToRole(["teacher"]);
const adminOnly = [accessToRole(["admin", "superadmin"]), requirePermission("reports")];

// No update or delete routes: a visit is written by its check-in and closed by
// its check-out, and nothing else may change it. Admin corrections are notes.
router.get("/me/today", isAuth, teacherOnly, getMyToday);
router.get("/me", isAuth, teacherOnly, validate(checkInHistoryQuerySchema, "query"), getMyHistory);
router.post("/", isAuth, teacherOnly, validate(checkInSchema), checkIn);
router.post(
  "/:id/check-out",
  isAuth,
  teacherOnly,
  validate(idParam, "params"),
  validate(checkOutSchema),
  checkOut
);

router.get("/", isAuth, adminOnly, validate(checkInReportQuerySchema, "query"), getCheckInReport);
router.post(
  "/:id/notes",
  isAuth,
  adminOnly,
  validate(idParam, "params"),
  validate(checkInNoteSchema),
  addCheckInNote
);

module.exports = router;
