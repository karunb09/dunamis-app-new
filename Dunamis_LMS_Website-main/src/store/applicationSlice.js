"use client";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/lib/axios";

const FILE_KEYS = ["cv", "profileVideo", "relevantCertificate", "profilePicture"];

export const submitApplication = createAsyncThunk(
  "application/submitApplication",
  async (formData, { dispatch, rejectWithValue }) => {
    // Multipart parts stream in append order, so each file owns a contiguous
    // byte range — per-file progress is derived from the aggregate loaded bytes.
    const files = FILE_KEYS.flatMap((key) => {
      const file = formData.get(key);
      return file instanceof File ? [{ key, size: file.size }] : [];
    });
    const totalFileBytes = files.reduce((sum, f) => sum + f.size, 0);
    try {
      const response = await api.post("/v1/teacherApplication/apply", formData, {
        timeout: 5 * 60 * 1000,
        onUploadProgress: (event) => {
          if (!event.total) return;
          dispatch(setUploadProgress(Math.round((event.loaded / event.total) * 100)));
          let offset = Math.max(event.total - totalFileBytes, 0);
          const fileProgress = {};
          files.forEach(({ key, size }) => {
            const loadedForFile = Math.min(Math.max(event.loaded - offset, 0), size);
            fileProgress[key] = size ? Math.round((loadedForFile / size) * 100) : 100;
            offset += size;
          });
          dispatch(setFileProgress(fileProgress));
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
    fileProgress: {},
  },
  reducers: {
    resetStatus: (state) => {
      state.loading = false;
      state.success = false;
      state.error = null;
      state.errorDetails = [];
      state.uploadProgress = 0;
      state.fileProgress = {};
    },
    setUploadProgress: (state, action) => {
      state.uploadProgress = action.payload;
    },
    setFileProgress: (state, action) => {
      state.fileProgress = action.payload;
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
        state.fileProgress = {};
      })
      .addCase(submitApplication.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
        state.uploadProgress = 100;
        Object.keys(state.fileProgress).forEach((key) => {
          state.fileProgress[key] = 100;
        });
      })
      .addCase(submitApplication.rejected, (state, action) => {
        state.loading = false;
        state.uploadProgress = 0;
        state.fileProgress = {};
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

export const { resetStatus, setUploadProgress, setFileProgress } =
  applicationSlice.actions;
export default applicationSlice.reducer;
