const express = require("express");
const router = express.Router();

const { isAuth, accessToRole, requirePermission } = require("../middleware/auth");
const {
  createContent,
  createStudentFeedbackReview,
  deleteContent,
  getAllContent,
  getPublicContent,
  updateContent,
} = require("../controller/siteContent.controller");

router.get("/public", getPublicContent);
router.post(
  "/student-feedback",
  isAuth,
  accessToRole(["student"]),
  createStudentFeedbackReview
);

// Website Content page; Chatbot Insights (contentManagement) writes FAQs here too.
const editors = [isAuth, accessToRole(["admin", "superadmin"]), requirePermission("websiteContent", "contentManagement")];

router.get("/", ...editors, getAllContent);
router.post("/", ...editors, createContent);
router.put("/:id", ...editors, updateContent);
router.delete("/:id", ...editors, deleteContent);

module.exports = router;
