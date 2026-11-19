const express = require("express");
const router = express.Router();

const { isAuth, accessToRole, requirePermission } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { getDailyAttendanceReport } = require("../controller/attendanceReport.controller");
const { dailyAttendanceQuerySchema } = require("../validators/attendanceReport.validator");
const { getTodaySchedule } = require("../controller/todaySchedule.controller");

const adminOnly = [accessToRole(["admin", "superadmin"]), requirePermission("reports")];

router.get(
  "/attendance/daily",
  isAuth,
  adminOnly,
  validate(dailyAttendanceQuerySchema, "query"),
  getDailyAttendanceReport
);

router.get(
  "/today-schedule",
  isAuth,
  accessToRole(["admin", "superadmin"]),
  requirePermission("studentManagement", "instructorManagement", "adminManagement"),
  getTodaySchedule
);

module.exports = router;
