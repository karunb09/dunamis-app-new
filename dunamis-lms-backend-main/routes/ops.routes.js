const express = require("express");
const router = express.Router();

const { isAuth, accessToRole } = require("../middleware/auth");
const { getOpsStatus } = require("../controller/ops.controller");

router.get("/status", isAuth, accessToRole(["admin", "superadmin"]), getOpsStatus);

module.exports = router;
