import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  createCategoryWithSubCategories,
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
    if (newSubCategory.trim()) {
      setSubCategories([...subCategories, newSubCategory.trim()]);
      setNewSubCategory("");
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      toast.error("Category name is required");
      return;
    }

    const payload = {
      name: categoryName,
      icon: selectedIcon || "",
      color: selectedColor,
      status: "draft",
      subcategories: subCategories.map((name) => ({ name, description: "" })),
    };

    try {
      const resultAction = await dispatch(createCategoryWithSubCategories(payload));
      const createdCategory = resultAction.payload;

      if (createdCategory && createdCategory._id) {
        toast.success("Category created successfully!");
        navigate("/admin/category-management");
      } else {
        toast.error("Failed to create category");
      }
    } catch (err) {
      toast.error("Error creating category");
    }
  };

  const findExistingSubcategoryByName = (name) => {
    return editingCategory?.subcategories.find((sub) => sub.name === name);
  };

  const getNewSubcategoryNames = (subCategoryNames) => {
    return subCategoryNames.filter((name) => !findExistingSubcategoryByName(name));
  };

  const handleUpdateCategory = async () => {
    if (!categoryName.trim()) {
      toast.error("Category name is required");
      return;
    }

    const newSubcategoryNames = getNewSubcategoryNames(subCategories);

    try {
      // Update basic fields first
      const basicPayload = {
        name: categoryName,
        icon: selectedIcon || "",
        color: selectedColor,
        status: editingCategory.status || "draft",
      };

      await dispatch(
        updateCategory({ id: editingCategory._id, updatedData: basicPayload })
      ).unwrap();

      // Create and add new subcategories
      if (newSubcategoryNames.length > 0) {
        for (const subName of newSubcategoryNames) {
          // Create subcategory
          const createdSubcat = await dispatch(
            createSubCategory({ name: subName, description: "" })
          ).unwrap();

          // Add to category
          await dispatch(
            updateCategory({
              id: editingCategory._id,
              updatedData: { subcategoryId: createdSubcat._id },
            })
          ).unwrap();
        }
      }

      toast.success("Category updated successfully!");
      navigate("/admin/category-management");
    } catch (err) {
      console.error("Update error:", err);
      toast.error("Failed to update category");
    }
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
      />

      <div className="flex justify-between gap-3 mt-8">
        <button
          onClick={() => navigate("/admin/category-management")}
          className="px-4 py-2 border bg-gray-50 rounded-2xl hover:bg-gray-100"
        >
          Cancel
        </button>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            className="bg-white text-black border border-black px-4 py-2 rounded-2xl"
            onClick={() =>
              console.log("Draft Saved:", {
                categoryName,
                selectedIcon,
                selectedColor,
                subCategories,
              })
            }
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
