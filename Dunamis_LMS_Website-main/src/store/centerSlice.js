
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

export const fetchOfflineCenters = createAsyncThunk(
  "offlineCenter/fetchOfflineCenters",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${BASE_URL}/v1/branch/get-all-branch`);
      
      // Add detailed logging
      console.log("Full API Response:", response);
      console.log("Response data:", response.data);
      console.log("Branches array:", response.data?.branches);
      
      // Check if branches exist and is an array
      if (response.data && Array.isArray(response.data.branches)) {
        return response.data.branches;
      }
      
      // If branches is undefined or not an array, return empty array
      console.warn("No branches found in response");
      return [];
      
    } catch (error) {
      console.error("API Error:", error);
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const offlineCenterSlice = createSlice({
  name: "offlineCenter",
  initialState: {
    centers: [],
    loading: false,
    error: null,
  },
  reducers: {
    // Add a manual setter in case you need it for debugging
    setCenters: (state, action) => {
      state.centers = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOfflineCenters.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOfflineCenters.fulfilled, (state, action) => {
        state.loading = false;
        state.centers = action.payload;
        console.log(" FULFILLED - Centers stored in Redux:", action.payload);
        console.log(" Payload length:", action.payload?.length);
        console.log(" State after update:", { ...state });
      })
      .addCase(fetchOfflineCenters.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Something went wrong";
        console.error("Fetch rejected:", action.payload);
      });
  },
});

export const { setCenters } = offlineCenterSlice.actions;
export default offlineCenterSlice.reducer;