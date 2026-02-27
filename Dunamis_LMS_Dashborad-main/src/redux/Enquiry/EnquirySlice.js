import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export const getAllEnquiries = createAsyncThunk(
  "enquiry/getAllEnquiries",
  async () => {
    const response = await axios.get(`${BASE_URL}/enquiry/`);
    return response.data.enquiries;
  }
);

export const getEnquiryById = createAsyncThunk(
  "enquiry/getEnquiryById",
  async (id) => {
    const response = await axios.get(`${BASE_URL}/enquiry/${id}`);
    return response.data;
  }
);

export const assignEnquiry = createAsyncThunk(
  "enquiry/assignEnquiry",
  async ({ id, adminId }, { dispatch }) => {
    const response = await axios.put(`${BASE_URL}/enquiry/assign/${id}`, {
      adminId,
    });
    dispatch(getAllEnquiries());
    return response.data;
  }
);

export const respondEnquiry = createAsyncThunk(
  "enquiry/respondEnquiry",
  async ({ id, message }, { dispatch }) => {
    const response = await axios.put(`${BASE_URL}/enquiry/respond/${id}`, {
      message,
    });
    dispatch(getAllEnquiries());
    return response.data;
  }
);

const enquirySlice = createSlice({
  name: "enquiry",
  initialState: {
    enquiries: [],
    selectedEnquiry: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getAllEnquiries.pending, (state) => {
        state.loading = true;
      })
      .addCase(getAllEnquiries.fulfilled, (state, action) => {
        state.loading = false;
        state.enquiries = action.payload;
        state.error = null;
      })
      .addCase(getAllEnquiries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(getEnquiryById.fulfilled, (state, action) => {
        state.selectedEnquiry = action.payload;
      })
      .addCase(assignEnquiry.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(respondEnquiry.fulfilled, (state) => {
        state.loading = false;
      });
  },
});

export default enquirySlice.reducer;
