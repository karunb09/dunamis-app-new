const express = require("express");
const router = express.Router();
const {
  createStudent,
  sendOTP,
  getAllStudents,
  getStudentById,
  getStudentOverview,
  getStudentAttendanceHomework,
  updateStudent,
  deleteStudent,
  getStudentsByType,
  searchStudents,
} = require("../controller/student.controller");
const { isAuth, accessToRole, requirePermission } = require("../middleware/auth");
const { studentParamInScope } = require("../middleware/staffScope");
const { getMyDashboard } = require("../controller/studentDashboard.controller");
const validate = require("../middleware/validate");
const { idParam } = require("../validators/common");
const {
  sendOtpSchema,
  createStudentSchema,
  pauseEnrollmentSchema,
  discontinueEnrollmentSchema,
  extendDueDateSchema,
  enrollmentParam,
  paymentParam,
} = require("../validators/student.validator");
const {
  pauseEnrollment,
  resumeEnrollment,
  discontinueEnrollment,
  extendDueDate,
} = require("../controller/studentLifecycle.controller");

const canAccessStudentRecord = (req, res, next) => {
  const accountType = req.user?.accountType;

  if (accountType === "admin" || accountType === "superadmin") {
    return next();
  }

  if (accountType === "student" && String(req.user?.roleId) === String(req.params.id)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "You are not authorized to access this student record",
  });
};

// send otp
router.post("/send-otp", validate(sendOtpSchema), sendOTP);
// create stud.
router.post("/create", validate(createStudentSchema), createStudent);
// get all stud.
// Students pass requirePermission untouched; canAccessStudentRecord keeps them to their own record.
const managers = requirePermission("studentManagement");

// No dashboard screen uses the unfiltered list: All Access only.
router.get("/get-all", isAuth, accessToRole(["admin", "superadmin"]), requirePermission(), getAllStudents);
// get by type
router.get("/get-by-type", isAuth, accessToRole(["admin", "superadmin"]), managers, getStudentsByType);
// search by name / email / phone (admin only)
// Also Manual Enroll, which Financials staff can open.
router.get("/search", isAuth, accessToRole(["admin", "superadmin"]), requirePermission("studentManagement", "financials"), searchStudents);
// overview (upcoming classes + activity)
router.get("/:id/overview", isAuth, accessToRole(["admin", "superadmin"]), managers, validate(idParam, "params"), studentParamInScope(), getStudentOverview);
// attendance & homework (admin view of full history)
router.get("/:id/attendance-homework", isAuth, accessToRole(["admin", "superadmin"]), managers, validate(idParam, "params"), studentParamInScope(), getStudentAttendanceHomework);
// the logged-in student's own Overview + Performance data (before "/:id" so
// "me" is never read as an id)
router.get("/me/dashboard", isAuth, accessToRole(["student"]), getMyDashboard);
// get by id
router.get("/:id", isAuth, accessToRole(["student", "admin", "superadmin"]), managers, validate(idParam, "params"), canAccessStudentRecord, studentParamInScope(), getStudentById);
// update
router.put("/:id", isAuth, accessToRole(["student", "admin", "superadmin"]), managers, validate(idParam, "params"), canAccessStudentRecord, studentParamInScope(), updateStudent);
// Enrollment lifecycle — admin only. Placed before "/:id" is irrelevant here
// (all are deeper paths), but they are grouped so the ownership rules stay
// visible next to each other.
const adminOnly = [accessToRole(["admin", "superadmin"]), managers, studentParamInScope()];

router.patch(
  "/:id/enrollment/:courseId/pause",
  isAuth,
  adminOnly,
  validate(enrollmentParam, "params"),
  validate(pauseEnrollmentSchema),
  pauseEnrollment
);
router.patch(
  "/:id/enrollment/:courseId/resume",
  isAuth,
  adminOnly,
  validate(enrollmentParam, "params"),
  resumeEnrollment
);
router.patch(
  "/:id/enrollment/:courseId/discontinue",
  isAuth,
  adminOnly,
  validate(enrollmentParam, "params"),
  validate(discontinueEnrollmentSchema),
  discontinueEnrollment
);
router.patch(
  "/:id/payment/:paymentId/extend-due-date",
  isAuth,
  adminOnly,
  validate(paymentParam, "params"),
  validate(extendDueDateSchema),
  extendDueDate
);

// delete
router.delete("/:id", isAuth, accessToRole(["admin", "superadmin"]), managers, validate(idParam, "params"), studentParamInScope(), deleteStudent);

module.exports = router;
