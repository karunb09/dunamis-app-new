const express = require("express");
const router = express.Router();

const { isAuth, accessToRole, requirePermission } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { idParam } = require("../validators/common");
const {
  createAdminSchema,
  updateAdminSchema,
} = require("../validators/admin.validator");
const {
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
} = require("../controller/admin.controller");

const managers = [isAuth, accessToRole(["admin", "superadmin"]), requirePermission("adminManagement")];

router.post("/create", ...managers, validate(createAdminSchema), createAdmin);
// The Enquiries page loads this list to assign enquiries.
router.get("/get-all-admin", isAuth, accessToRole(["admin", "superadmin"]), requirePermission("adminManagement", "enquiries"), getAllAdmins);
router.get("/:id", ...managers, validate(idParam, "params"), getAdminById);
router.put("/:id", ...managers, validate(idParam, "params"), validate(updateAdminSchema), updateAdmin);
router.delete("/:id", ...managers, validate(idParam, "params"), deleteAdmin);
module.exports = router;
