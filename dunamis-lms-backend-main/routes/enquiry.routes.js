const express = require("express");
const router = express.Router();
const {
  createEnquiry,
  getAllEnquiries,
  getEnquiryById,
  assignEnquiry,
  respondEnquiry,
} = require("../controller/enquiry.controller");
const { isAuth, accessToRole, requirePermission } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { createEnquirySchema } = require("../validators/enquiry.validator");

// Public - Website Contact Form
router.post("/create", validate(createEnquirySchema), createEnquiry);

// Admin/Super Admin
router.get("/", isAuth, accessToRole(["admin", "superadmin"]), requirePermission("enquiries"), getAllEnquiries);
router.get("/:id", isAuth, accessToRole(["admin", "superadmin"]), requirePermission("enquiries"), getEnquiryById);

// Assign
router.put(
  "/assign/:id",
  isAuth,
  accessToRole(["admin", "superadmin"]),
  requirePermission("enquiries"),
  assignEnquiry
);

// Admin responds
router.put(
  "/respond/:id",
  isAuth,
  accessToRole(["admin", "superadmin"]),
  requirePermission("enquiries"),
  respondEnquiry
);

module.exports = router;
