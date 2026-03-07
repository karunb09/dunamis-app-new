const express = require("express");
const router = express.Router();
const {
  createEnquiry,
  getAllEnquiries,
  getEnquiryById,
  assignEnquiry,
  respondEnquiry,
} = require("../controller/enquiry.controller");
const { isAuth, accessToRole } = require("../middleware/auth");

// Public - Website Contact Form
router.post("/create", createEnquiry);

// Admin/Super Admin
router.get("/", isAuth, accessToRole(["admin", "superadmin"]), getAllEnquiries);
router.get("/:id", isAuth, accessToRole(["admin", "superadmin"]), getEnquiryById);

// Super Admin assigns
router.put(
  "/assign/:id",
  isAuth,
  accessToRole(["superadmin"]),
  assignEnquiry
);

// Admin responds
router.put(
  "/respond/:id",
  isAuth,
  accessToRole(["admin", "superadmin"]),
  respondEnquiry
);

module.exports = router;
