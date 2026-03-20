const express = require("express");
const router = express.Router();
const {
  createCourse,
  getAllCourses,
  getCourseById,
  getAllCoursesAdmin,
  getCourseByIdAdmin,
  updateCourse,
  deleteCourse,
} = require("../controller/course.controller");
const { isAuth, accessToRole } = require("../middleware/auth");
// Public routes (no auth needed)
router.get("/get", getAllCourses);
router.get("/get/:id", getCourseById);

// Admin routes
router.get(
  "/manage",
  isAuth,
  accessToRole(["admin", "superadmin"]),
  getAllCoursesAdmin
);
router.get(
  "/manage/:id",
  isAuth,
  accessToRole(["admin", "superadmin"]),
  getCourseByIdAdmin
);
router.post(
  "/create",
  isAuth,
  accessToRole(["admin", "superadmin"]),
  createCourse
);
router.put(
  "/update/:id",
  isAuth,
  accessToRole(["admin", "superadmin"]),
  updateCourse
);
router.delete(
  "/delete/:id",
  isAuth,
  accessToRole(["admin", "superadmin"]),
  deleteCourse
);

module.exports = router;
