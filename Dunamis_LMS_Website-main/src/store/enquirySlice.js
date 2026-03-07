import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/lib/axios";

export const createEnquiry = createAsyncThunk(
  "enquiry/createEnquiry",
  async (enquiryData, { rejectWithValue }) => {
    try {
      const response = await api.post("/v1/enquiry/create", enquiryData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const enquirySlice = createSlice({
  name: "enquiry",
  initialState: {
    enquiry: null,
    status: "idle",
    error: null,
    errorDetails: [],
  },
  reducers: {
    resetStatus: (state) => {
      state.status = "idle";
      state.error = null;
      state.errorDetails = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createEnquiry.pending, (state) => {
        state.status = "loading";
        state.error = null;
        state.errorDetails = [];
      })
      .addCase(createEnquiry.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.enquiry = action.payload?.enquiry || null;
        state.error = null;
        state.errorDetails = [];
      })
      .addCase(createEnquiry.rejected, (state, action) => {
        state.status = "failed";
        if (typeof action.payload === "string") {
          state.error = action.payload;
          state.errorDetails = [];
          return;
        }

        state.error =
          action.payload?.message || action.error?.message || "Submission failed";
        state.errorDetails = Array.isArray(action.payload?.errors)
          ? action.payload.errors
          : [];
      });
  },
});

export const { resetStatus } = enquirySlice.actions;
export default enquirySlice.reducer;
