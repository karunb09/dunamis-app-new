"use client";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/lib/axios";

export const submitApplication = createAsyncThunk(
  "application/submitApplication",
  async (formData, { rejectWithValue }) => {
    try {
      const response = await api.post("/v1/teacherApplication/apply", formData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Something went wrong");
    }
  }
);

const applicationSlice = createSlice({
  name: "application",
  initialState: {
    loading: false,
    success: false,
    error: null,
  },
  reducers: {
    resetStatus: (state) => {
      state.loading = false;
      state.success = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitApplication.pending, (state) => {
        state.loading = true;
        state.success = false;
        state.error = null;
      })
      .addCase(submitApplication.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(submitApplication.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload?.message ||
          action.error?.message ||
          "Submission failed";
      });
  },
});

export const { resetStatus } = applicationSlice.actions;
export default applicationSlice.reducer;
