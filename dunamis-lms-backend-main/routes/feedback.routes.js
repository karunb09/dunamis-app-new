const express = require("express");
const router = express.Router();
const {
  createFeedback,
  getFeedbackByCourse,
  getFeedbackByTeacher,
  deleteFeedback,
} = require("../controller/feedback.controller");
const { isAuth } = require("../middleware/auth");

// POST: Submit feedback
router.post("/", isAuth, createFeedback);

// GET: All feedback for a course
router.get("/course/:courseId", isAuth, getFeedbackByCourse);

// GET: All feedback for a teacher
router.get("/teacher/:teacherId", isAuth, getFeedbackByTeacher);

// DELETE feedback
router.delete("/:id", isAuth, deleteFeedback);

module.exports = router;
