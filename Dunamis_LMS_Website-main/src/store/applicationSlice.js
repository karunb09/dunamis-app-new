"use client";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/lib/axios";

export const submitApplication = createAsyncThunk(
  "application/submitApplication",
  async (formData, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.post("/v1/teacherApplication/apply", formData, {
        timeout: 5 * 60 * 1000,
        onUploadProgress: (event) => {
          if (!event.total) return;
          dispatch(setUploadProgress(Math.round((event.loaded / event.total) * 100)));
        },
      });
      return response.data;
    } catch (error) {
      if (error.code === "ECONNABORTED") {
        return rejectWithValue(
          "Upload timed out. Check your connection (large video files take longer) and try again."
        );
      }
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
    uploadProgress: 0,
  },
  reducers: {
    resetStatus: (state) => {
      state.loading = false;
      state.success = false;
      state.error = null;
      state.errorDetails = [];
      state.uploadProgress = 0;
    },
    setUploadProgress: (state, action) => {
      state.uploadProgress = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitApplication.pending, (state) => {
        state.loading = true;
        state.success = false;
        state.error = null;
        state.errorDetails = [];
        state.uploadProgress = 0;
      })
      .addCase(submitApplication.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
        state.uploadProgress = 100;
      })
      .addCase(submitApplication.rejected, (state, action) => {
        state.loading = false;
        state.uploadProgress = 0;
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

export const { resetStatus, setUploadProgress } = applicationSlice.actions;
export default applicationSlice.reducer;
