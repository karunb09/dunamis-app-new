const Category = require("../model/category.model");
const asyncHandler = require("../utils/asyncHandler");
const SubCategory = require("../model/subCategory.model");

// Create Category
exports.createCategory = asyncHandler(async (req, res) => {
    const { name, icon, color, subcategories, status } = req.body;
    const existingSubCategory = await SubCategory.findById(subcategories);
    if (!existingSubCategory) {
      return res.status(400).json({
        success: false,
        message: "SubCategory does not exist in the database.",
      });
    }
    if (!name || !status) {
      return res.status(400).json({ message: "Name and status are required." });
    }

    const category = new Category({ name, icon, color, subcategories, status });
    await category.save();

    res
      .status(201)
      .json({ message: "Category created successfully", category });
});
// Get Category
exports.getAllCategories = asyncHandler(async (req, res) => {
    const categories = await Category.find()
      .populate("subcategories")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, categories });
});
// Update Category
exports.updateCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { subcategoryId, subcategories, ...updates } = req.body;

    const updateQuery = { ...updates };

    if (Array.isArray(subcategories)) {
      updateQuery.subcategories = subcategories;
    }

    if (subcategoryId) {
      updateQuery.$addToSet = { subcategories: subcategoryId };
    }

    const updatedCategory = await Category.findByIdAndUpdate(id, updateQuery, {
      returnDocument: "after",
      runValidators: true,
    }).populate("subcategories");

    if (!updatedCategory) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    res.status(200).json({
      success: true,
      message: subcategoryId
        ? "Subcategory added to category"
        : "Category updated",
      category: updatedCategory,
    });
});
// Delete Category
exports.deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const deletedCategory = await Category.findByIdAndDelete(id);

    if (!deletedCategory) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Category deleted successfully" });
});

// Create Category along with SubCategories
exports.createCategoryWithSubCategories = asyncHandler(async (req, res) => {
    const { name, icon, color, subcategories, status } = req.body;

    if (!name || !status) {
      return res.status(400).json({ message: "Name and status are required." });
    }

    if (!Array.isArray(subcategories)) {
      return res.status(400).json({
        success: false,
        message: "Subcategories must be an array.",
      });
    }

    const createdSubCategoryIds = [];

    for (const sub of subcategories) {
      if (typeof sub === "object" && sub.name) {
        const existingSub = await SubCategory.findOne({ name: sub.name.trim() });
        if (existingSub) {
          createdSubCategoryIds.push(existingSub._id);
        } else {
          const newSubCategory = new SubCategory({
            name: sub.name.trim(),
            description: sub.description || "No description provided.",
          });
          await newSubCategory.save();
          createdSubCategoryIds.push(newSubCategory._id);
        }
      } else if (typeof sub === "string" || sub instanceof String) {
        const existingSub = await SubCategory.findById(sub);
        if (existingSub) {
          createdSubCategoryIds.push(existingSub._id);
        } else {
          return res.status(400).json({
            success: false,
            message: `Subcategory ID ${sub} does not exist.`,
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: "Subcategory format is invalid.",
        });
      }
    }

    // Create the category with subcategory IDs
    const category = new Category({
      name,
      icon,
      color,
      subcategories: createdSubCategoryIds,
      status,
    });

    await category.save();

    // Populate subcategories for response
    await category.populate("subcategories");

    res.status(201).json({
      success: true,
      message: "Category and subcategories created successfully",
      category,
    });
});
