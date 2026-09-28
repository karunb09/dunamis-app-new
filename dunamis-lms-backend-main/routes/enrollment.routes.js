const express = require("express");
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  getEnrolledCourses,
  getPaymentAccessStatus,
  getCourseEnrollmentStatus,
  generateInstallmentOrders,
  adminEnrollStudent,
  reassignEnrollment,
} = require("../controller/enrollmentController.js");
const { isAuth, accessToRole, requirePermission } = require("../middleware/auth.js");
const { bodyPlaceInScope } = require("../middleware/staffScope");
const validate = require("../middleware/validate");
const {
  createOrderSchema,
  verifyPaymentSchema,
  reassignEnrollmentSchema,
} = require("../validators/enrollment.validator");

router.post("/create-order", isAuth, validate(createOrderSchema), createOrder);
router.post("/verify-payment", isAuth, validate(verifyPaymentSchema), verifyPayment);
router.get("/access-status", isAuth, getPaymentAccessStatus);
router.get("/course-status/:courseId", isAuth, getCourseEnrollmentStatus);
router.get("/enrolled-courses", isAuth, getEnrolledCourses);
router.post("/generate-installments", isAuth, generateInstallmentOrders);
// Manual (cash) enrollment is offered to Financials staff too.
router.post(
  "/admin-enroll",
  isAuth,
  accessToRole(["admin", "superadmin"]),
  requirePermission("studentManagement", "financials"),
  bodyPlaceInScope(),
  adminEnrollStudent
);
router.patch(
  "/reassign",
  isAuth,
  accessToRole(["admin", "superadmin"]),
  requirePermission("studentManagement"),
  validate(reassignEnrollmentSchema),
  bodyPlaceInScope(),
  reassignEnrollment
);

module.exports = router;
