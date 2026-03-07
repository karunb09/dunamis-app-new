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
    errorDetails: [],
  },
  reducers: {
    resetStatus: (state) => {
      state.loading = false;
      state.success = false;
      state.error = null;
      state.errorDetails = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitApplication.pending, (state) => {
        state.loading = true;
        state.success = false;
        state.error = null;
        state.errorDetails = [];
      })
      .addCase(submitApplication.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(submitApplication.rejected, (state, action) => {
        state.loading = false;
        if (typeof action.payload === "string") {
          state.error = action.payload;
          state.errorDetails = [];
          return;
        }

        state.error =
          action.payload?.message ||
          action.error?.message ||
          "Submission failed";
        state.errorDetails = Array.isArray(action.payload?.errors)
          ? action.payload.errors
          : [];
      });
  },
});

export const { resetStatus } = applicationSlice.actions;
export default applicationSlice.reducer;
