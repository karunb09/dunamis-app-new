const express = require("express");
const { isAuth, accessToRole, requirePermission } = require("../middleware/auth");
const { publicCache } = require("../middleware/cacheControl");
const {
  createSubCategory,
  getAllSubCategories,
  getSubCategoryById,
  updateSubCategory,
  deleteSubCategory,
} = require("../controller/subCategory.controller");
const router = express.Router();

router.get("/get-all-subCat", publicCache(), getAllSubCategories);
router.get("/:id", getSubCategoryById);
router.post("/create", isAuth, accessToRole(["admin", "superadmin"]), requirePermission("categoryManagement"), createSubCategory);
router.put("/:id", isAuth, accessToRole(["admin", "superadmin"]), requirePermission("categoryManagement"), updateSubCategory);
router.delete("/:id", isAuth, accessToRole(["admin", "superadmin"]), requirePermission("categoryManagement"), deleteSubCategory);

module.exports = router;
