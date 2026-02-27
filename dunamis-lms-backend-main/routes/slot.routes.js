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
const { isAuth } = require("../middleware/auth");

// router.post("/",isAuth, createSlot); // Create slot
router.get("/", getAllSlots); // Get all slots
router.get("/available",isAuth, getAvailableSlots); // Filter by branch/date
router.put("/:id", updateSlot); // Update slot
router.delete("/:id", deleteSlot); // Delete slot
router.post("/weekly-availability", isAuth, setWeeklyAvailability);

module.exports = router;
