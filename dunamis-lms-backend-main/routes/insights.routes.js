const express = require("express");
const router = express.Router();

const { isAuth, accessToRole, requirePermission } = require("../middleware/auth");
const { getMonthlyInsights, getInsightMonths } = require("../controller/insights.controller");

const adminOnly = [accessToRole(["admin", "superadmin"]), requirePermission("reports")];

router.get("/monthly", isAuth, adminOnly, getMonthlyInsights);
router.get("/months", isAuth, adminOnly, getInsightMonths);

module.exports = router;
