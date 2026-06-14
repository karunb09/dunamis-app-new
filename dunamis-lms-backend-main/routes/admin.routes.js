const express = require("express");
const router = express.Router();

const {
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
} = require("../controller/admin.controller");
const { isAuth, accessToRole } = require("../middleware/auth");

// All admin-account operations are admin/superadmin-only (matches the
// dashboard's adminManagement gating). Reads included — they expose admin data.
const adminOnly = [isAuth, accessToRole(["admin", "superadmin"])];

router.post("/create", ...adminOnly, createAdmin);
router.get("/get-all-admin", ...adminOnly, getAllAdmins);
router.get("/:id", ...adminOnly, getAdminById);
router.put("/:id", ...adminOnly, updateAdmin);
router.delete("/:id", ...adminOnly, deleteAdmin);
module.exports = router;
