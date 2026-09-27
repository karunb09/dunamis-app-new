const express = require("express");
const router = express.Router();

const { isAuth, accessToRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { idParam } = require("../validators/common");
const { getZones, createZone, updateZone, deleteZone } = require("../controller/zone.controller");

const adminOnly = [isAuth, accessToRole(["admin", "superadmin"])];

router.get("/", ...adminOnly, getZones);
router.post("/", ...adminOnly, createZone);
router.put("/:id", ...adminOnly, validate(idParam, "params"), updateZone);
router.delete("/:id", ...adminOnly, validate(idParam, "params"), deleteZone);

module.exports = router;
