const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const {
  bookDemoSlot,
  getAllBookings,
  getMyBookings,
  updateBooking,
  rescheduleDemoBooking,
  cancelDemoBooking,
} = require("../controller/demoBooking.controller");
const { accessToRole, isAuth } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  bookDemoSchema,
  updateBookingSchema,
  rescheduleBookingSchema,
  cancelBookingSchema,
} = require("../validators/demoBooking.validator");

const optionalAuth = (req, res, next) => {
  try {
    const token =
      req.cookies?.token ||
      req.body?.token ||
      req.headers.authorization?.replace(/^\s*\w+\s+/, "").trim() ||
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      req.user = null;
      return next();
    }

    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

router.post("/", optionalAuth, validate(bookDemoSchema), bookDemoSlot);
router.get("/my", isAuth, accessToRole(["student"]), getMyBookings);
router.get("/", isAuth, accessToRole(["admin", "superadmin", "teacher"]), getAllBookings);
// Students may move or drop their own demo; the 24-hour cutoff is enforced in
// the controller, where the actor's role is known.
const bookingActors = accessToRole(["student", "admin", "superadmin", "teacher"]);

router.patch(
  "/:id/reschedule",
  isAuth,
  bookingActors,
  validate(rescheduleBookingSchema),
  rescheduleDemoBooking
);
router.patch(
  "/:id/cancel",
  isAuth,
  bookingActors,
  validate(cancelBookingSchema),
  cancelDemoBooking
);
router.put(
  "/:id",
  isAuth,
  accessToRole(["admin", "superadmin", "teacher"]),
  validate(updateBookingSchema),
  updateBooking
);

module.exports = router;
