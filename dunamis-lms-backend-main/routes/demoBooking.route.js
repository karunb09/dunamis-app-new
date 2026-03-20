const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const {
  bookDemoSlot,
  getAllBookings,
  updateBooking,
} = require("../controller/demoBooking.controller");
const { accessToRole, isAuth } = require("../middleware/auth");

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

router.post("/", optionalAuth, bookDemoSlot);
router.get("/", isAuth, accessToRole(["admin", "superadmin", "teacher"]), getAllBookings);
router.put("/:id", isAuth, accessToRole(["admin", "superadmin", "teacher"]), updateBooking);

module.exports = router;
