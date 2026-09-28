const express = require("express");
const router = express.Router();
const {
  createSlot,
  getAllSlots,
  getAvailableSlots,
  updateSlot,
  deleteSlot,
  setWeeklyAvailability,
  setClassMeetingLink,
  setSlotMeetingLink,
  getMyClasses,
} = require("../controller/slot.controller");
const { accessToRole, isAuth, requirePermission } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { idParam } = require("../validators/common");
const {
  createSlotSchema,
  meetingLinkSchema,
  parentAvailabilityParam,
} = require("../validators/slot.validator");

const staffOrTeacher = [accessToRole(["admin", "superadmin", "teacher"]), requirePermission("instructorManagement")];

router.post("/", isAuth, staffOrTeacher, validate(createSlotSchema), createSlot);
router.get("/", isAuth, staffOrTeacher, getAllSlots);
router.get("/available", getAvailableSlots);
// Before "/:id" so "my-classes" and "class" are never swallowed as slot ids.
router.get("/my-classes", isAuth, staffOrTeacher, getMyClasses);
router.patch(
  "/class/:parentAvailabilityId/meeting-link",
  isAuth,
  staffOrTeacher,
  validate(parentAvailabilityParam, "params"),
  validate(meetingLinkSchema),
  setClassMeetingLink
);
router.patch(
  "/:id/meeting-link",
  isAuth,
  staffOrTeacher,
  validate(idParam, "params"),
  validate(meetingLinkSchema),
  setSlotMeetingLink
);
router.put("/:id", isAuth, staffOrTeacher, updateSlot);
router.delete("/:id", isAuth, staffOrTeacher, deleteSlot);
router.post("/weekly-availability", isAuth, accessToRole(["teacher"]), setWeeklyAvailability);

module.exports = router;
