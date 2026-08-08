const express = require("express");
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  getEnrolledCourses,
  getPaymentAccessStatus,
  generateInstallmentOrders,
  adminEnrollStudent,
} = require("../controller/enrollmentController.js");
const { isAuth, accessToRole } = require("../middleware/auth.js");
const validate = require("../middleware/validate");
const {
  createOrderSchema,
  verifyPaymentSchema,
} = require("../validators/enrollment.validator");

router.post("/create-order", isAuth, validate(createOrderSchema), createOrder);
router.post("/verify-payment", isAuth, validate(verifyPaymentSchema), verifyPayment);
router.get("/access-status", isAuth, getPaymentAccessStatus);
router.get("/enrolled-courses", isAuth, getEnrolledCourses);
router.post("/generate-installments", isAuth, generateInstallmentOrders);
router.post("/admin-enroll", isAuth, accessToRole(["admin", "superadmin"]), adminEnrollStudent);

module.exports = router;
