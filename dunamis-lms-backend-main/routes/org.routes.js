const express = require("express");
const router = express.Router();

const { isAuth, accessToRole, requirePermission, requireActiveStaff } = require("../middleware/auth");
const { getMyScope, getOrgChart, getStaffDirectory } = require("../controller/org.controller");

const adminOnly = [isAuth, accessToRole(["admin", "superadmin"])];

// People pickers: the admin form (manager), instructor forms (manager) and
// branch / city forms (centre contact, city manager).
router.get(
  "/staff",
  ...adminOnly,
  requirePermission("adminManagement", "instructorManagement", "offlineCenters"),
  getStaffDirectory
);
// What the caller's own lists are limited to (banner + filter options).
router.get("/me/scope", ...adminOnly, requireActiveStaff, getMyScope);
router.get("/chart", ...adminOnly, requirePermission("adminManagement"), getOrgChart);

module.exports = router;
