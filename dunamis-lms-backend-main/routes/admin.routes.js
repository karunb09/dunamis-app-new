const express = require("express");
const router = express.Router();

const { isAuth, accessToRole } = require("../middleware/auth");
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

router.post("/create", isAuth, accessToRole(["admin", "superadmin"]), validate(createAdminSchema), createAdmin);
router.get("/get-all-admin", isAuth, accessToRole(["admin", "superadmin"]), getAllAdmins);
router.get("/:id", isAuth, accessToRole(["admin", "superadmin"]), validate(idParam, "params"), getAdminById);
router.put("/:id", isAuth, accessToRole(["admin", "superadmin"]), validate(idParam, "params"), validate(updateAdminSchema), updateAdmin);
router.delete("/:id", isAuth, accessToRole(["admin", "superadmin"]), validate(idParam, "params"), deleteAdmin);
module.exports = router;
