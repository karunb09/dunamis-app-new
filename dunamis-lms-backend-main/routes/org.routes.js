const express = require("express");
const router = express.Router();

const { isAuth, accessToRole } = require("../middleware/auth");
const { getOrgChart, getStaffDirectory } = require("../controller/org.controller");

const adminOnly = [isAuth, accessToRole(["admin", "superadmin"])];

router.get("/staff", ...adminOnly, getStaffDirectory);
router.get("/chart", ...adminOnly, getOrgChart);

module.exports = router;
