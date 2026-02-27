import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

// Fetch all categories
export const fetchCategories = createAsyncThunk(
  "category/fetchCategories",
  async () => {
    const response = await axios.get(
      `${BASE_URL}/v1/category/get-all-category`
    );
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
      });
  },
});

export default categorySlice.reducer;
