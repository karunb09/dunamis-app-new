const express = require("express");
const router = express.Router();

const { isAuth, accessToRole } = require("../middleware/auth");
const {
  submitAttendanceHomework,
  getTeacherHomeworkHistory,
  getStudentHomeworkDashboard,
  getTeacherPastClasses,
  getTeacherUpcomingClasses,
} = require("../controller/attendanceHomework.controller");

// Create attendance & assign homework (teacher)
router.post("/", isAuth, accessToRole(["teacher"]), submitAttendanceHomework);

// Get all attendance & homework history for a teacher
router.get("/teacher/history", isAuth, accessToRole(["teacher"]),getTeacherHomeworkHistory);

// Get student homework dashboard (student)
router.get("/student/homework", isAuth, accessToRole(["student"]), getStudentHomeworkDashboard);

// Get past enrolled slots with attendance coverage status (teacher)
router.get("/teacher/past-classes", isAuth, accessToRole(["teacher"]), getTeacherPastClasses);

// Get today's and upcoming enrolled slots (teacher)
router.get("/teacher/upcoming-classes", isAuth, accessToRole(["teacher"]), getTeacherUpcomingClasses);

module.exports = router;
