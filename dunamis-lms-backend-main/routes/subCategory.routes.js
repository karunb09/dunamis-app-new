const express = require("express");
const {
  createSubCategory,
  getAllSubCategories,
  getSubCategoryById,
  updateSubCategory,
  deleteSubCategory,
} = require("../controller/subCategory.controller");
const router = express.Router();

// Create SubCategory
const { isAuth, accessToRole } = require("../middleware/auth");
const adminOnly = [isAuth, accessToRole(["admin", "superadmin"])];
router.post("/create", ...adminOnly, createSubCategory);

// Get All SubCategories
router.get("/get-all-subCat", getAllSubCategories);

// Get SubCategory by ID
router.get("/:id", getSubCategoryById);

// Update SubCategory by ID
router.put("/:id", ...adminOnly, updateSubCategory);

// Delete SubCategory by ID
router.delete("/:id", ...adminOnly, deleteSubCategory);

module.exports = router;
