const express = require("express");
const router = express.Router();
const {
  createEnquiry,
  getAllEnquiries,
  getEnquiryById,
  assignEnquiry,
  respondEnquiry,
} = require("../controller/enquiry.controller");

// Public - Website Contact Form
router.post("/create", createEnquiry);

// Admin/Super Admin
router.get("/", getAllEnquiries);
router.get("/:id", getEnquiryById);

// Super Admin assigns
router.put("/assign/:id", assignEnquiry);

// Admin responds
router.put("/respond/:id", respondEnquiry);

module.exports = router;