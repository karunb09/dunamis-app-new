const express = require("express");
const router = express.Router();
const {
  bookDemoSlot,
  getAllBookings,
  updateBooking,
} = require("../controller/demoBooking.controller");
const { isAuth } = require("../middleware/auth");

router.post("/", isAuth, bookDemoSlot); // Book a slot
router.get("/", getAllBookings); // Get all bookings
router.put("/:id", updateBooking); // Update status

module.exports = router;
