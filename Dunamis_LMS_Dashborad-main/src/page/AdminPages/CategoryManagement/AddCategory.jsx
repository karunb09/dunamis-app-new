import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  createCategoryWithSubCategories,
  deleteCategory,
  updateCategory,
} from "../../../redux/Category/CategorySlice";
import CategoryForm from "./CategoryForm";
import { createSubCategory } from "../../../redux/SubCategory/SubCategorySlice";
import toast from "react-hot-toast";

const AddCategory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const editingCategory = location.state?.category || null;

  const [categoryName, setCategoryName] = useState(editingCategory?.name || "");
  const [subCategories, setSubCategories] = useState(
    editingCategory?.subcategories ? editingCategory.subcategories.map((sub) => sub.name) : []
  );
  const [newSubCategory, setNewSubCategory] = useState("");
  const [selectedColor, setSelectedColor] = useState(editingCategory?.color || "#000000");
  const [selectedIcon, setSelectedIcon] = useState(editingCategory?.icon || "");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleAddSubCategory = () => {
    const trimmedName = newSubCategory.trim();

    if (!trimmedName) {
      toast.error("Sub-category name is required");
      return;
    }

    if (subCategories.some((name) => name.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error("Sub-category already added");
      return;
    }

    setSubCategories([...subCategories, trimmedName]);
    setNewSubCategory("");
  };

  const handleRemoveSubCategory = (indexToRemove) => {
    setSubCategories((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const persistCategory = async (targetStatus) => {
    if (!categoryName.trim()) {
      toast.error("Category name is required");
      return;
    }

    const normalizedSubCategories = subCategories
      .map((name) => String(name || "").trim())
      .filter(Boolean);

    const hasDuplicateSubcategory = normalizedSubCategories.some(
      (name, index) =>
        normalizedSubCategories.findIndex(
          (item) => item.toLowerCase() === name.toLowerCase()
        ) !== index
    );

    if (hasDuplicateSubcategory) {
      toast.error("Sub-category names must be unique");
      return;
    }

    try {
      if (!editingCategory) {
        const payload = {
          name: categoryName,
          icon: selectedIcon || "",
          color: selectedColor,
          status: targetStatus,
          subcategories: normalizedSubCategories.map((name) => ({ name, description: "" })),
        };

        const resultAction = await dispatch(
          createCategoryWithSubCategories(payload)
        );
        const createdCategory = resultAction.payload;

        if (!createdCategory?._id) {
          toast.error(createdCategory?.message || resultAction.error?.message || "Failed to create category");
          return;
        }
      } else {
        const existingSubcategoryIds = normalizedSubCategories
          .map((name) => findExistingSubcategoryByName(name)?._id)
          .filter(Boolean);

        const newSubcategoryNames = getNewSubcategoryNames(normalizedSubCategories);
        const createdSubcategoryIds = [];

        for (const subName of newSubcategoryNames) {
          const createdSubcat = await dispatch(
            createSubCategory({ name: subName, description: "" })
          ).unwrap();
          createdSubcategoryIds.push(createdSubcat._id);
        }

        await dispatch(
          updateCategory({
            id: editingCategory._id,
            updatedData: {
              name: categoryName,
              icon: selectedIcon || "",
              color: selectedColor,
              status: targetStatus,
              subcategories: [...existingSubcategoryIds, ...createdSubcategoryIds],
            },
          })
        ).unwrap();
      }

      toast.success(
        targetStatus === "draft"
          ? "Category saved to drafts!"
          : editingCategory
            ? "Category updated successfully!"
            : "Category created successfully!"
      );
      navigate("/admin/category-management");
    } catch (err) {
      console.error("Category save error:", err);
      toast.error(
        err?.message ||
        err?.payload?.message ||
        (targetStatus === "draft"
          ? "Failed to save draft"
          : editingCategory
            ? "Failed to update category"
            : "Error creating category")
      );
    }
  };

  const handleCreateCategory = async () => {
    await persistCategory("published");
  };

  const handleSaveDraft = async () => {
    await persistCategory("draft");
  };

  const handleDeleteCategory = async () => {
    if (!editingCategory?._id) return;

    try {
      await dispatch(deleteCategory(editingCategory._id)).unwrap();
      toast.success("Category deleted successfully!");
      navigate("/admin/category-management");
    } catch (err) {
      toast.error("Failed to delete category");
    }
  };

  const findExistingSubcategoryByName = (name) => {
    return editingCategory?.subcategories.find((sub) => sub.name === name);
  };

  const getNewSubcategoryNames = (subCategoryNames) => {
    return subCategoryNames.filter((name) => !findExistingSubcategoryByName(name));
  };

  const handleUpdateCategory = async () => {
    await persistCategory(editingCategory?.status || "published");
  };

  return (
    <div className="max-w-7xl mx-auto bg-gray-100 p-6 rounded-xl shadow">
      <h2 className="text-lg font-semibold mb-6">
        {editingCategory ? "Edit Category" : "Add New Category"}
      </h2>

      <CategoryForm
        categoryName={categoryName}
        setCategoryName={setCategoryName}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
        selectedIcon={selectedIcon}
        setSelectedIcon={setSelectedIcon}
        showColorPicker={showColorPicker}
        setShowColorPicker={setShowColorPicker}
        showIconPicker={showIconPicker}
        setShowIconPicker={setShowIconPicker}
        showEmojiPicker={showEmojiPicker}
        setShowEmojiPicker={setShowEmojiPicker}
        subCategories={subCategories}
        setSubCategories={setSubCategories}
        newSubCategory={newSubCategory}
        setNewSubCategory={setNewSubCategory}
        handleAddSubCategory={handleAddSubCategory}
        handleRemoveSubCategory={handleRemoveSubCategory}
      />

      <div className="flex justify-between gap-3 mt-8">
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/admin/category-management")}
            className="px-4 py-2 border bg-gray-50 rounded-2xl hover:bg-gray-100"
          >
            Cancel
          </button>

          {editingCategory && (
            <button
              type="button"
              onClick={handleDeleteCategory}
              className="px-4 py-2 border border-red-500 text-red-600 bg-white rounded-2xl hover:bg-red-50"
            >
              Delete Category
            </button>
          )}
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            className="bg-white text-black border border-black px-4 py-2 rounded-2xl"
            onClick={handleSaveDraft}
          >
            Save Draft
          </button>

          <button
            type="button"
            className="px-4 py-2 bg-black text-white border border-white rounded-2xl"
            onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
          >
            {editingCategory ? "Update Category" : "Save Category"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddCategory;
