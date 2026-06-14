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
const { isAuth, accessToRole } = require("../middleware/auth");
const adminOnly = [isAuth, accessToRole(["admin", "superadmin"])];
router.post("/create", ...adminOnly, createCategory);
// Get Category
router.get("/get-all-category", getAllCategories);
// Update CAtegory
router.put("/:id", ...adminOnly, updateCategory);
// Delete Category
router.delete("/:id", ...adminOnly, deleteCategory); 
// Create full Category
router.post("/create-full", ...adminOnly, createCategoryWithSubCategories);

module.exports = router;
