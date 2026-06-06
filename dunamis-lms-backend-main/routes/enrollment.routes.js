const express = require("express");
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  getEnrolledCourses,
  getPaymentAccessStatus,
  createNextInstallmentOrder,
  generateInstallmentOrders,
  adminEnrollStudent,
} = require("../controller/enrollmentController.js");
const { isAuth, accessToRole } = require("../middleware/auth.js");

router.post("/create-order", isAuth, createOrder);
router.post("/verify-payment", isAuth, verifyPayment);
router.get("/access-status", isAuth, getPaymentAccessStatus);
router.get("/enrolled-courses", isAuth, getEnrolledCourses);
router.post("/next-installment-order", isAuth, createNextInstallmentOrder);
router.post("/generate-installments", isAuth, generateInstallmentOrders);
router.post("/admin-enroll", isAuth, accessToRole(["admin", "superadmin"]), adminEnrollStudent);

module.exports = router;
