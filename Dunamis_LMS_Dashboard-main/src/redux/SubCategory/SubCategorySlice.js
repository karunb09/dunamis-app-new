import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosAuth from "../../utils/axiosAuth";

const BASE_URL = import.meta.env.VITE_BASE_URL;
// Get all SubCategory
export const fetchSubCategories = createAsyncThunk(
  "subCategory/fetchSubCategories",
  async () => {
    const response = await axiosAuth.get(`${BASE_URL}/subCategory/get-all-subCat`);
    return response.data.data;
  }
);
// Create SubCategory
export const createSubCategory = createAsyncThunk(
  "subCategory/createSubCategory",
  async (newSubCategory) => {
    const response = await axiosAuth.post(
      `${BASE_URL}/subCategory/create`,
      newSubCategory
    );
    return response.data.subCategory;
  }
);
// Update SubCategory
export const updateSubCategory = createAsyncThunk(
  "subCategory/updateSubCategory",
  async ({ id, updatedData }) => {
    const response = await axiosAuth.put(
      `${BASE_URL}/subCategory/${id}`,
      updatedData
    );
    return response.data.data;
  }
);
const subCategorySlice = createSlice({
  name: "subCategory",
  initialState: {
    subCategories: [],
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // get all subCategiry
      .addCase(fetchSubCategories.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchSubCategories.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.subCategories = action.payload;
      })
      .addCase(fetchSubCategories.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      // Create Sub category
      .addCase(createSubCategory.pending, (state) => {
        state.status = "loading";
      })
      .addCase(createSubCategory.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.subCategories.push(action.payload);
      })
      .addCase(createSubCategory.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      // Update SubCategory
      .addCase(updateSubCategory.pending, (state) => {
        state.status = "loading";
      })
      .addCase(updateSubCategory.fulfilled, (state, action) => {
        state.status = "succeeded";
        const updatedSubCat = action.payload;
        const index = state.subCategories.findIndex(
          (sub) => sub._id === updatedSubCat._id
        );
        if (index !== -1) {
          state.subCategories[index] = updatedSubCat;
        }
      })
      .addCase(updateSubCategory.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      });
  },
});

export default subCategorySlice.reducer;
