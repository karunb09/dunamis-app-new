const express = require("express");
const router = express.Router();
const {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
  createCategoryWithSubCategories
} = require("../controller/category.controller");

// Create Category
router.post("/create", createCategory);
// Get Category
router.get("/get-all-category", getAllCategories);
// Update CAtegory
router.put("/:id", updateCategory);
// Delete Category
router.delete("/:id", deleteCategory); 
// Create full Category
router.post("/create-full", createCategoryWithSubCategories);

module.exports = router;
