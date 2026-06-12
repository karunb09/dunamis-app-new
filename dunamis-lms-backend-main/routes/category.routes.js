const express = require("express");
const router = express.Router();
const { isAuth, accessToRole } = require("../middleware/auth");
const {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
  createCategoryWithSubCategories
} = require("../controller/category.controller");

router.get("/get-all-category", getAllCategories);
router.post("/create", isAuth, accessToRole(["admin", "superadmin"]), createCategory);
router.put("/:id", isAuth, accessToRole(["admin", "superadmin"]), updateCategory);
router.delete("/:id", isAuth, accessToRole(["admin", "superadmin"]), deleteCategory);
router.post("/create-full", isAuth, accessToRole(["admin", "superadmin"]), createCategoryWithSubCategories);

module.exports = router;
