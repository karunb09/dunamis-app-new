const express = require("express");
const router = express.Router();
const {
  createSlot,
  getAllSlots,
  getAvailableSlots,
  updateSlot,
  deleteSlot,
  setWeeklyAvailability,
} = require("../controller/slot.controller");
const { accessToRole, isAuth } = require("../middleware/auth");

router.post("/", isAuth, accessToRole(["admin", "superadmin", "teacher"]), createSlot);
router.get("/", isAuth, accessToRole(["admin", "superadmin", "teacher"]), getAllSlots);
router.get("/available", getAvailableSlots);
router.put("/:id", isAuth, accessToRole(["admin", "superadmin", "teacher"]), updateSlot);
router.delete("/:id", isAuth, accessToRole(["admin", "superadmin", "teacher"]), deleteSlot);
router.post("/weekly-availability", isAuth, accessToRole(["teacher"]), setWeeklyAvailability);

module.exports = router;
