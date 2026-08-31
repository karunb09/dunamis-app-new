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
const { isAuth, accessToRole } = require("../middleware/auth");
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
router.get("/get-all", isAuth, accessToRole(["admin", "superadmin"]), getAllStudents);
// get by type
router.get("/get-by-type", isAuth, accessToRole(["admin", "superadmin"]), getStudentsByType);
// search by name / email / phone (admin only)
router.get("/search", isAuth, accessToRole(["admin", "superadmin"]), searchStudents);
// overview (upcoming classes + activity)
router.get("/:id/overview", isAuth, accessToRole(["admin", "superadmin"]), validate(idParam, "params"), getStudentOverview);
// attendance & homework (admin view of full history)
router.get("/:id/attendance-homework", isAuth, accessToRole(["admin", "superadmin"]), validate(idParam, "params"), getStudentAttendanceHomework);
// get by id
router.get("/:id", isAuth, accessToRole(["student", "admin", "superadmin"]), validate(idParam, "params"), canAccessStudentRecord, getStudentById);
// update
router.put("/:id", isAuth, accessToRole(["student", "admin", "superadmin"]), validate(idParam, "params"), canAccessStudentRecord, updateStudent);
// Enrollment lifecycle — admin only. Placed before "/:id" is irrelevant here
// (all are deeper paths), but they are grouped so the ownership rules stay
// visible next to each other.
const adminOnly = accessToRole(["admin", "superadmin"]);

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
router.delete("/:id", isAuth, accessToRole(["admin", "superadmin"]), validate(idParam, "params"), deleteStudent);

module.exports = router;
