const express = require("express");
const router = express.Router();

const { isAuth, accessToRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { getDailyAttendanceReport } = require("../controller/attendanceReport.controller");
const { dailyAttendanceQuerySchema } = require("../validators/attendanceReport.validator");

const adminOnly = accessToRole(["admin", "superadmin"]);

router.get(
  "/attendance/daily",
  isAuth,
  adminOnly,
  validate(dailyAttendanceQuerySchema, "query"),
  getDailyAttendanceReport
);

module.exports = router;
