const express = require("express");
const router = express.Router();

const {
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
} = require("../controller/admin.controller");

router.post("/create", createAdmin);
router.get("/get-all-admin", getAllAdmins);
router.get("/:id", getAdminById);
router.put("/:id", updateAdmin);
router.delete("/:id", deleteAdmin);
module.exports = router;
