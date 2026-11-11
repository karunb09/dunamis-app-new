const express = require("express");
const router = express.Router();

const { isAuth, accessToRole, requirePermission } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { idParam } = require("../validators/common");
const { getUnits, createUnit, updateUnit, deleteUnit } = require("../controller/employeeUnit.controller");

const staff = [isAuth, accessToRole(["admin", "superadmin"])];
// requirePermission() with no keys = All Access (the CEO) or superadmin only.
const topOnly = [...staff, requirePermission()];

// The admin form and both instructor hiring forms pick a unit from this list.
router.get("/", ...staff, requirePermission("adminManagement", "instructorManagement"), getUnits);
router.post("/", ...topOnly, createUnit);
router.patch("/:id", ...topOnly, validate(idParam, "params"), updateUnit);
router.delete("/:id", ...topOnly, validate(idParam, "params"), deleteUnit);

module.exports = router;
