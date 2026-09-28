const express = require("express");
const router = express.Router();

const { isAuth, accessToRole, requirePermission } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { idParam } = require("../validators/common");
const { getZones, createZone, updateZone, deleteZone } = require("../controller/zone.controller");

const adminOnly = [isAuth, accessToRole(["admin", "superadmin"]), requirePermission("offlineCenters")];

// The admin form's BDE responsibility picker lists zones too.
router.get("/", isAuth, accessToRole(["admin", "superadmin"]), requirePermission("offlineCenters", "adminManagement"), getZones);
router.post("/", ...adminOnly, createZone);
router.put("/:id", ...adminOnly, validate(idParam, "params"), updateZone);
router.delete("/:id", ...adminOnly, validate(idParam, "params"), deleteZone);

module.exports = router;
