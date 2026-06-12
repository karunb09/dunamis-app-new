import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosAuth from "../../utils/axiosAuth";

const BASE_URL = import.meta.env.VITE_BASE_URL;

// Fetch all categories
export const fetchCategories = createAsyncThunk(
  "category/fetchCategories",
  async () => {
    const response = await axiosAuth.get(`${BASE_URL}/category/get-all-category`);
    const categories = response.data.categories;

    const subCategories = categories.flatMap((category) =>
      (category.subcategories || []).map((subCat) => ({
        ...subCat,
        categoryId: category._id,
      }))
    );

    return { categories, subCategories };
  }
);
// Create single category
export const createCategory = createAsyncThunk(
  "category/createCategory",
  async (newCategory) => {
    const response = await axiosAuth.post(
      `${BASE_URL}/category/create-category`,
      newCategory
    );
    return response.data.category;
  }
);
// Create category with SubCat
export const createCategoryWithSubCategories = createAsyncThunk(
  "category/createCategoryWithSubCategories",
  async (categoryData, { rejectWithValue }) => {
    try {
      const response = await axiosAuth.post(
        `${BASE_URL}/category/create-full`,
        categoryData
      );
      return response.data.category;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);
// Update category by id
export const updateCategory = createAsyncThunk(
  "category/updateCategory",
  async ({ id, updatedData }, { rejectWithValue }) => {
    try {
      const response = await axiosAuth.put(
        `${BASE_URL}/category/${id}`,
        updatedData
      );
      return response.data.category; 
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);
// Delete category by id
export const deleteCategory = createAsyncThunk(
  "category/deleteCategory",
  async (id, { rejectWithValue }) => {
    try {
      await axiosAuth.delete(`${BASE_URL}/category/${id}`);
      return id; // Return deleted category id
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);
const categorySlice = createSlice({
  name: "category",
  initialState: {
    categories: [],
    subCategories: [],
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch categories
      .addCase(fetchCategories.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.categories = action.payload.categories;
        state.subCategories = action.payload.subCategories;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      // Create single category
      .addCase(createCategory.pending, (state) => {
        state.status = "loading";
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.categories.push(action.payload);
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      // Create category with subcategories
      .addCase(createCategoryWithSubCategories.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(createCategoryWithSubCategories.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.categories.push(action.payload);
        if (
          action.payload.subcategories &&
          action.payload.subcategories.length
        ) {
          state.subCategories.push(...action.payload.subcategories);
        }
      })
      .addCase(createCategoryWithSubCategories.rejected, (state, action) => {
        state.status = "failed";
        state.error =
          action.payload?.message ||
          "Failed to create category with subcategories";
      })
      // Update Categoryby ID
      .addCase(updateCategory.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.status = "succeeded";
        const updatedCategory = action.payload;
        const index = state.categories.findIndex(
          (c) => c._id === updatedCategory._id
        );
        if (index !== -1) {
          state.categories[index] = updatedCategory;
        }
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.message || action.error.message;
      })
      // Delete category cases
      .addCase(deleteCategory.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.categories = state.categories.filter(
          (category) => category._id !== action.payload
        );
        state.subCategories = state.subCategories.filter(
          (sub) => sub.categoryId !== action.payload
        );
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.message || action.error.message;
      });
  },
});

export default categorySlice.reducer;
