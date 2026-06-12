const express = require("express");
const router = express.Router();

const { isAuth, accessToRole } = require("../middleware/auth");
const {
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
} = require("../controller/admin.controller");

router.post("/create", isAuth, accessToRole(["admin", "superadmin"]), createAdmin);
router.get("/get-all-admin", isAuth, accessToRole(["admin", "superadmin"]), getAllAdmins);
router.get("/:id", isAuth, accessToRole(["admin", "superadmin"]), getAdminById);
router.put("/:id", isAuth, accessToRole(["admin", "superadmin"]), updateAdmin);
router.delete("/:id", isAuth, accessToRole(["admin", "superadmin"]), deleteAdmin);
module.exports = router;
