const express = require("express");
const router = express.Router();
const {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
} = require("../controller/course.controller");
const { isAuth, accessToRole } = require("../middleware/auth");
// Routes
router.post("/create", createCourse);
// router.get("/get", getAllCourses);
router.get("/get/:id", getCourseById);
router.put("/update/:id", updateCourse);
// router.delete("/delete/:id", deleteCourse);

// Routes with authentication for admin-only actions
// router.post("/create", isAuth, accessToRole(["admin"]), createCourse);
// router.put("/update/:id", isAuth, accessToRole(["admin"]), updateCourse);
router.delete("/delete/:id", isAuth, accessToRole(["admin"]), deleteCourse);

// Public routes (no auth needed)
router.get("/get", getAllCourses);
router.get("/get/:id", getCourseById);

module.exports = router;
