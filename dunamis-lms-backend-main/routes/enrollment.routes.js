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
const { isAuth, accessToRole } = require("../middleware/auth.js");
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
router.post("/admin-enroll", isAuth, accessToRole(["admin", "superadmin"]), adminEnrollStudent);
router.patch(
  "/reassign",
  isAuth,
  accessToRole(["admin", "superadmin"]),
  validate(reassignEnrollmentSchema),
  reassignEnrollment
);

module.exports = router;
