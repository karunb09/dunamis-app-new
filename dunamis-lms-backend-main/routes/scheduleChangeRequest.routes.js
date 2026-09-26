const express = require("express");
const router = express.Router();
const {
  getMyScheduleChangeRequests,
  getAllScheduleChangeRequests,
  reviewScheduleChangeRequest,
} = require("../controller/scheduleChangeRequest.controller");
const { accessToRole, isAuth } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { idParam } = require("../validators/common");
const { reviewScheduleChangeSchema } = require("../validators/scheduleChangeRequest.validator");

// Before "/:id" so "mine" is never read as a request id.
router.get("/mine", isAuth, accessToRole(["teacher"]), getMyScheduleChangeRequests);
router.get("/", isAuth, accessToRole(["admin", "superadmin"]), getAllScheduleChangeRequests);
router.patch(
  "/:id",
  isAuth,
  accessToRole(["admin", "superadmin"]),
  validate(idParam, "params"),
  validate(reviewScheduleChangeSchema),
  reviewScheduleChangeRequest
);

module.exports = router;
