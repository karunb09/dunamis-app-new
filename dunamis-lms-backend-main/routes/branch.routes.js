const express = require("express");
const router = express.Router();


const {
  createBranch,
  getAllBranches,
  getBranchManagers,
  deleteBranch,
  updateBranch,
  getBranchById,
} = require("../controller/branch.controller");
const { publicCache } = require("../middleware/cacheControl");
const { isAuth, accessToRole } = require("../middleware/auth");

const adminOnly = [isAuth, accessToRole(["admin", "superadmin"])];

// Create Branch (admin only)
router.post("/create", ...adminOnly, createBranch);
// Get all branch (public, cacheable)
router.get("/get-all-branch", publicCache(), getAllBranches);
// Get branch managers
router.get("/managers", getBranchManagers);
// Get branch by id (public, cacheable)
router.get("/:id", publicCache(), getBranchById);
// Update Branch (admin only)
router.put("/:id", ...adminOnly, updateBranch);
// Delete branch (admin only)
router.delete("/:id", ...adminOnly, deleteBranch);
module.exports = router;
