const express = require("express");
const router = express.Router();

const { isAuth, accessToRole } = require("../middleware/auth");
const { getMonthlyInsights, getInsightMonths } = require("../controller/insights.controller");

const adminOnly = accessToRole(["admin", "superadmin"]);

router.get("/monthly", isAuth, adminOnly, getMonthlyInsights);
router.get("/months", isAuth, adminOnly, getInsightMonths);

module.exports = router;
