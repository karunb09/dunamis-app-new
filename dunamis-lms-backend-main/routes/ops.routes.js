const express = require("express");
const router = express.Router();

const { isAuth, accessToRole, requireActiveStaff } = require("../middleware/auth");
const { getOpsStatus } = require("../controller/ops.controller");

router.get("/status", isAuth, accessToRole(["admin", "superadmin"]), requireActiveStaff, getOpsStatus);

module.exports = router;
