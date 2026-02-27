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
// Create Branch
router.post("/create", createBranch);
// Get all branch
router.get("/get-all-branch", getAllBranches);
// Get branch managers
router.get("/managers", getBranchManagers);
// Get branch by id
router.get("/:id", getBranchById);
// Update Branch
router.put("/:id", updateBranch);
// Delete branch
router.delete("/:id", deleteBranch); 
module.exports = router;
