const express = require("express");
const router = express.Router();
const { isAuth, accessToRole } = require("../middleware/auth");
const {
  submitCourseRequest,
  getMyRequests,
  getAllRequests,
  updateRequestStatus,
} = require("../controller/courseRequest.controller");

router.post("/", isAuth, accessToRole(["teacher"]), submitCourseRequest);
router.get("/my", isAuth, accessToRole(["teacher"]), getMyRequests);
router.get("/", isAuth, accessToRole(["admin", "superadmin"]), getAllRequests);
router.put("/:id/status", isAuth, accessToRole(["admin", "superadmin"]), updateRequestStatus);

module.exports = router;
