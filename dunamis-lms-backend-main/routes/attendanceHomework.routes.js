const express = require("express");
const router = express.Router();

const { isAuth, accessToRole } = require("../middleware/auth");
const { submitAttendanceHomework, getTeacherHomeworkHistory, getStudentHomeworkDashboard, submitStudentHomework, giveHomeworkFeedback } = require("../controller/attendanceHomework.controller");

// Create attendance & assign homework (teacher)
router.post("/", isAuth, accessToRole(["teacher"]), submitAttendanceHomework);

// Get all attendance & homework history for a teacher
router.get("/teacher/history", isAuth, accessToRole(["teacher"]),getTeacherHomeworkHistory);

// Get student homework dashboard (student)
router.get("/student/homework", isAuth, accessToRole(["student"]),getStudentHomeworkDashboard);

// Student submits homework
// router.put("/homework/submit/:id", isAuth, accessToRole(["student"]),submitStudentHomework);

// Teacher gives feedback on submitted homework
// router.put("/homework/feedback/:id", isAuth, accessToRole(["teacher"]),giveHomeworkFeedback);

module.exports = router;
