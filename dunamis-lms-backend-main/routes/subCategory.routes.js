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
router.post("/create", createSubCategory);

// Get All SubCategories
router.get("/get-all-subCat", getAllSubCategories);

// Get SubCategory by ID
router.get("/:id", getSubCategoryById);

// Update SubCategory by ID
router.put("/:id", updateSubCategory);

// Delete SubCategory by ID
router.delete("/:id", deleteSubCategory);

module.exports = router;
