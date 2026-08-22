const express = require("express");
const { isAuth, accessToRole } = require("../middleware/auth");
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
router.post("/create", isAuth, accessToRole(["admin", "superadmin"]), createSubCategory);
router.put("/:id", isAuth, accessToRole(["admin", "superadmin"]), updateSubCategory);
router.delete("/:id", isAuth, accessToRole(["admin", "superadmin"]), deleteSubCategory);

module.exports = router;
