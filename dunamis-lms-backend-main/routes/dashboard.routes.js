const express = require("express");
const router = express.Router();

const { isAuth, accessToRole } = require("../middleware/auth");
const { getAdminSummary } = require("../controller/dashboard.controller");

router.get(
  "/admin-summary",
  isAuth,
  accessToRole(["admin", "superadmin"]),
  getAdminSummary
);

module.exports = router;
