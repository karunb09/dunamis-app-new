const express = require("express");
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  getEnrolledCourses,
  getPaymentAccessStatus,
  createNextInstallmentOrder,
  generateInstallmentOrders,
} = require("../controller/enrollmentController.js");
const { isAuth } = require("../middleware/auth.js"); // Changed from auth to isAuth

router.post("/create-order", isAuth, createOrder);
router.post("/verify-payment", isAuth, verifyPayment);
router.get("/access-status", isAuth, getPaymentAccessStatus);
router.get("/enrolled-courses", isAuth, getEnrolledCourses);
router.post("/next-installment-order", isAuth, createNextInstallmentOrder);
router.post("/generate-installments", isAuth, generateInstallmentOrders);

module.exports = router;
