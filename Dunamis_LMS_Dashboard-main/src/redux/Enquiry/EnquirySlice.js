import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { getStoredToken } from "../../utils/authSession";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export const getAllEnquiries = createAsyncThunk(
  "enquiry/getAllEnquiries",
  async (_, { rejectWithValue }) => {
    try {
      const token = getStoredToken();
      const response = await axios.get(`${BASE_URL}/enquiry/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true,
      });
      return response.data.enquiries;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const getEnquiryById = createAsyncThunk(
  "enquiry/getEnquiryById",
  async (id, { rejectWithValue }) => {
    try {
      const token = getStoredToken();
      const response = await axios.get(`${BASE_URL}/enquiry/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const assignEnquiry = createAsyncThunk(
  "enquiry/assignEnquiry",
  async ({ id, adminId }, { dispatch, rejectWithValue }) => {
    try {
      const token = getStoredToken();
      const response = await axios.put(
        `${BASE_URL}/enquiry/assign/${id}`,
        { adminId },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true,
        }
      );
      dispatch(getAllEnquiries());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const respondEnquiry = createAsyncThunk(
  "enquiry/respondEnquiry",
  async ({ id, message }, { dispatch, rejectWithValue }) => {
    try {
      const token = getStoredToken();
      const response = await axios.put(
        `${BASE_URL}/enquiry/respond/${id}`,
        { message },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true,
        }
      );
      dispatch(getAllEnquiries());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const enquirySlice = createSlice({
  name: "enquiry",
  initialState: {
    enquiries: [],
    selectedEnquiry: null,
    loading: false,
    listStatus: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getAllEnquiries.pending, (state) => {
        state.loading = true;
        state.listStatus = "loading";
      })
      .addCase(getAllEnquiries.fulfilled, (state, action) => {
        state.loading = false;
        state.listStatus = "succeeded";
        state.enquiries = action.payload;
        state.error = null;
      })
      .addCase(getAllEnquiries.rejected, (state, action) => {
        state.loading = false;
        state.listStatus = "failed";
        state.error = action.payload || action.error.message;
      })
      .addCase(getEnquiryById.fulfilled, (state, action) => {
        state.selectedEnquiry = action.payload;
      })
      .addCase(getEnquiryById.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      })
      .addCase(assignEnquiry.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(assignEnquiry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(respondEnquiry.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(respondEnquiry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      });
  },
});

export default enquirySlice.reducer;
