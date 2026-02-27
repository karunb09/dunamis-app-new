const express = require("express");
const router = express.Router();
const { createOrder, verifyPayment, getEnrolledCourses, generateInstallmentOrders } = require("../controller/enrollmentController.js");
const { isAuth } = require("../middleware/auth.js"); // Changed from auth to isAuth

router.post("/create-order", isAuth, createOrder);
router.post("/verify-payment", isAuth, verifyPayment);
router.get("/enrolled-courses", isAuth, getEnrolledCourses);
router.post("/generate-installments", isAuth, generateInstallmentOrders);

module.exports = router;