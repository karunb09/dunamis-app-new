
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

export const fetchOfflineCenters = createAsyncThunk(
  "offlineCenter/fetchOfflineCenters",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${BASE_URL}/v1/branch/get-all-branch`);

      if (response.data && Array.isArray(response.data.branches)) {
        return response.data.branches;
      }

      return [];
    } catch (error) {
      if (error.response?.status === 404) {
        return [];
      }
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
  {
    condition: (_, { getState }) => {
      const { offlineCenters } = getState();
      return !offlineCenters.loading && offlineCenters.centers.length === 0;
    },
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
      })
      .addCase(fetchOfflineCenters.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Something went wrong";
      });
  },
});

export const { setCenters } = offlineCenterSlice.actions;
export default offlineCenterSlice.reducer;
