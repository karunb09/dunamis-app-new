const express = require("express");
const router = express.Router();
const { isAuth, accessToRole, requirePermission } = require("../middleware/auth");
const {
  submitCourseRequest,
  getMyRequests,
  getAllRequests,
  updateCourseItemStatus,
} = require("../controller/courseRequest.controller");

router.post("/", isAuth, accessToRole(["teacher"]), submitCourseRequest);
router.get("/my", isAuth, accessToRole(["teacher"]), getMyRequests);
router.get("/", isAuth, accessToRole(["admin", "superadmin"]), requirePermission("courseManagement"), getAllRequests);
router.patch("/:id/items/:itemIndex", isAuth, accessToRole(["admin", "superadmin"]), requirePermission("courseManagement"), updateCourseItemStatus);

module.exports = router;
