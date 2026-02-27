import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

export const createEnquiry = createAsyncThunk(
  "enquiry/createEnquiry",
  async (enquiryData, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/v1/enquiry/create`,
        enquiryData
      );
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
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(createEnquiry.pending, (state) => {
        state.status = "loading";
      })
      .addCase(createEnquiry.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.enquiry = action.payload;
      })
      .addCase(createEnquiry.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
      });
  },
});

export default enquirySlice.reducer;
