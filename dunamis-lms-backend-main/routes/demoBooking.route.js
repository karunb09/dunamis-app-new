const express = require("express");
const router = express.Router();
const {
  bookDemoSlot,
  getAllBookings,
  updateBooking,
} = require("../controller/demoBooking.controller");
const { accessToRole, isAuth } = require("../middleware/auth");

router.post("/", isAuth, bookDemoSlot);
router.get("/", isAuth, accessToRole(["admin", "superadmin", "teacher"]), getAllBookings);
router.put("/:id", isAuth, accessToRole(["admin", "superadmin", "teacher"]), updateBooking);

module.exports = router;
