const SubCategory = require("../model/subCategory.model");
const asyncHandler = require("../utils/asyncHandler");

// Create SubCategory
exports.createSubCategory = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    const existingSubCategory = await SubCategory.findOne({ name });
    if (existingSubCategory) {
      return res.status(400).json({
        success: false,
        message: "SubCategory already exists.",
      });
    }

    const newSubCategory = new SubCategory({ name, description });
    await newSubCategory.save();

    res.status(201).json({
      success: true,
      message: "SubCategory created successfully",
      subCategory: newSubCategory,
    });
});

// Get All SubCategory
exports.getAllSubCategories = asyncHandler(async (req, res) => {
    const subCategories = await SubCategory.find();
    res.status(200).json({ success: true, subCategories });
});

// Get SubCategory By ID
exports.getSubCategoryById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const subCategory = await SubCategory.findById(id);

    if (!subCategory) {
      return res
        .status(404)
        .json({ success: false, message: "SubCategory not found" });
    }

    res.status(200).json({ success: true, subCategory });
});

// Update SubCategory
exports.updateSubCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    const subCategory = await SubCategory.findById(id);
    if (!subCategory) {
      return res
        .status(404)
        .json({ success: false, message: "SubCategory not found" });
    }

    subCategory.name = updates.name || subCategory.name;
    subCategory.description = updates.description || subCategory.description;

    await subCategory.save();

    res.status(200).json({
      success: true,
      message: "SubCategory updated successfully",
      subCategory,
    });
});

// Delete SubCategory
exports.deleteSubCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const subCategory = await SubCategory.findByIdAndDelete(id);

    if (!subCategory) {
      return res
        .status(404)
        .json({ success: false, message: "SubCategory not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "SubCategory deleted successfully" });
});
