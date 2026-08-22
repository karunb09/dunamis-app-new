import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { getStoredToken } from "../../utils/authSession";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export const getAllCallbackRequests = createAsyncThunk(
  "callbackRequest/getAllCallbackRequests",
  async (_, { rejectWithValue }) => {
    try {
      const token = getStoredToken();
      const response = await axios.get(`${BASE_URL}/callback-request/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true,
      });
      return response.data.callbackRequests;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const updateCallbackRequestStatus = createAsyncThunk(
  "callbackRequest/updateCallbackRequestStatus",
  async ({ id, status }, { dispatch, rejectWithValue }) => {
    try {
      const token = getStoredToken();
      const response = await axios.put(
        `${BASE_URL}/callback-request/${id}`,
        { status },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true,
        }
      );
      dispatch(getAllCallbackRequests());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const callbackRequestSlice = createSlice({
  name: "callbackRequest",
  initialState: {
    callbackRequests: [],
    loading: false,
    listStatus: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getAllCallbackRequests.pending, (state) => {
        state.loading = true;
        state.listStatus = "loading";
      })
      .addCase(getAllCallbackRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.listStatus = "succeeded";
        state.callbackRequests = action.payload;
        state.error = null;
      })
      .addCase(getAllCallbackRequests.rejected, (state, action) => {
        state.loading = false;
        state.listStatus = "failed";
        state.error = action.payload || action.error.message;
      })
      .addCase(updateCallbackRequestStatus.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      });
  },
});

export default callbackRequestSlice.reducer;
