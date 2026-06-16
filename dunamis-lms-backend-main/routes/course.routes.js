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
  upsertInstructorCourseMedia,
  getInstructorCourseMedia,
} = require("../controller/course.controller");
const { isAuth, accessToRole } = require("../middleware/auth");
const { publicCache } = require("../middleware/cacheControl");
const validate = require("../middleware/validate");
const { idParam } = require("../validators/common");
// Public routes (no auth needed) — cacheable, non-personalized reads
router.get("/get", publicCache(), getAllCourses);
router.get("/get/:id", publicCache(), getCourseById);

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
  validate(idParam, "params"),
  updateCourse
);
router.delete(
  "/delete/:id",
  isAuth,
  accessToRole(["admin", "superadmin"]),
  validate(idParam, "params"),
  deleteCourse
);

// Instructor course media (demo video + certificates per course)
router.put(
  "/:id/instructor-media",
  isAuth,
  accessToRole(["teacher", "admin", "superadmin"]),
  upsertInstructorCourseMedia
);
router.get(
  "/:id/instructor-media",
  isAuth,
  accessToRole(["teacher", "admin", "superadmin"]),
  getInstructorCourseMedia
);

module.exports = router;
