const express = require("express");
const router = express.Router();

const { isAuth, accessToRole } = require("../middleware/auth");
const {
  createBranch,
  getAllBranches,
  getBranchManagers,
  deleteBranch,
  updateBranch,
  getBranchById,
} = require("../controller/branch.controller");

router.get("/get-all-branch", getAllBranches);
router.get("/managers", getBranchManagers);
router.get("/:id", getBranchById);
router.post("/create", isAuth, accessToRole(["admin", "superadmin"]), createBranch);
router.put("/:id", isAuth, accessToRole(["admin", "superadmin"]), updateBranch);
router.delete("/:id", isAuth, accessToRole(["admin", "superadmin"]), deleteBranch);
module.exports = router;
