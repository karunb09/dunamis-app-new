const express = require("express");
const router = express.Router();

const { isAuth, accessToRole } = require("../middleware/auth");
const {
  submitAttendanceHomework,
  getTeacherHomeworkHistory,
  getStudentHomeworkDashboard,
  getTeacherPastClasses,
  getTeacherCourseClasses,
  getTeacherClassAttendance,
  updateAttendanceHomework,
} = require("../controller/attendanceHomework.controller");

// Create attendance & assign homework (teacher)
router.post("/", isAuth, accessToRole(["teacher"]), submitAttendanceHomework);

// Class roster + existing submission for a slot (teacher)
router.get("/teacher/class/:slotId", isAuth, accessToRole(["teacher"]), getTeacherClassAttendance);

// Edit a previously recorded class (teacher)
router.put("/teacher/class/:slotId", isAuth, accessToRole(["teacher"]), updateAttendanceHomework);

// Get all attendance & homework history for a teacher
router.get("/teacher/history", isAuth, accessToRole(["teacher"]),getTeacherHomeworkHistory);

// Get student class records: attendance + homework + topic (student)
router.get("/student/homework", isAuth, accessToRole(["student"]), getStudentHomeworkDashboard);

// Get past enrolled slots with attendance coverage status (teacher)
router.get("/teacher/past-classes", isAuth, accessToRole(["teacher"]), getTeacherPastClasses);

// Latest class per course with students + submitted flag (teacher)
router.get("/teacher/course-classes", isAuth, accessToRole(["teacher"]), getTeacherCourseClasses);

module.exports = router;
