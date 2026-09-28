const express = require("express");
const router = express.Router();
const { isAuth, accessToRole, requirePermission } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { idParam } = require("../validators/common");
const { publicCache } = require("../middleware/cacheControl");
const {
  createCategorySchema,
  createCategoryFullSchema,
} = require("../validators/category.validator");
const {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
  createCategoryWithSubCategories
} = require("../controller/category.controller");

router.get("/get-all-category", publicCache(), getAllCategories);
router.post("/create", isAuth, accessToRole(["admin", "superadmin"]), requirePermission("categoryManagement"), validate(createCategorySchema), createCategory);
router.put("/:id", isAuth, accessToRole(["admin", "superadmin"]), requirePermission("categoryManagement"), validate(idParam, "params"), updateCategory);
router.delete("/:id", isAuth, accessToRole(["admin", "superadmin"]), requirePermission("categoryManagement"), validate(idParam, "params"), deleteCategory);
router.post("/create-full", isAuth, accessToRole(["admin", "superadmin"]), requirePermission("categoryManagement"), validate(createCategoryFullSchema), createCategoryWithSubCategories);

module.exports = router;
