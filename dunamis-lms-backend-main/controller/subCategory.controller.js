const SubCategory = require("../model/subCategory.model");
const { sendValidationError } = require("../utils/validationErrorResponse");

// Create SubCategory
exports.createSubCategory = async (req, res) => {
  try {
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
  } catch (error) {
    sendValidationError(res, error, "Error creating subcategory");
  }
};

// Get All SubCategory
exports.getAllSubCategories = async (req, res) => {
  try {
    const subCategories = await SubCategory.find();
    res.status(200).json({ success: true, subCategories });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching subcategories",
      error: error.message,
    });
  }
};

// Get SubCategory By ID
exports.getSubCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const subCategory = await SubCategory.findById(id);

    if (!subCategory) {
      return res
        .status(404)
        .json({ success: false, message: "SubCategory not found" });
    }

    res.status(200).json({ success: true, subCategory });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching subcategory",
      error: error.message,
    });
  }
};

// Update SubCategory
exports.updateSubCategory = async (req, res) => {
  try {
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
  } catch (error) {
    sendValidationError(res, error, "Error updating subcategory");
  }
};

// Delete SubCategory
exports.deleteSubCategory = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting subcategory",
      error: error.message,
    });
  }
};
