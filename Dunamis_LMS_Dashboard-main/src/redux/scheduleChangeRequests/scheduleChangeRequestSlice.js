import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getStoredToken } from "../../utils/authSession";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const jsonHeaders = () => {
  const token = getStoredToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const fetchScheduleChangeRequests = createAsyncThunk(
  "scheduleChangeRequests/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE_URL}/schedule-change-requests`, {
        headers: jsonHeaders(),
        credentials: "include",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to load schedule change requests");
      return { items: data.requests || [], total: data.total || 0 };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
  {
    condition: (_arg, { getState }) => {
      const { listStatus } = getState().scheduleChangeRequests;
      return listStatus === "idle" || listStatus === "failed";
    },
  }
);

export const reviewScheduleChangeRequest = createAsyncThunk(
  "scheduleChangeRequests/review",
  async ({ id, status, adminNote }, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE_URL}/schedule-change-requests/${id}`, {
        method: "PATCH",
        headers: jsonHeaders(),
        credentials: "include",
        body: JSON.stringify({ status, adminNote }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to review request");
      return data.request;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const scheduleChangeRequestSlice = createSlice({
  name: "scheduleChangeRequests",
  initialState: {
    items: [],
    total: 0,
    listStatus: "idle",
    listLoading: false,
    reviewLoading: false,
    error: null,
  },
  reducers: {
    invalidateScheduleChangeRequests: (state) => {
      state.listStatus = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchScheduleChangeRequests.pending, (state) => {
        state.listLoading = true;
        state.listStatus = "loading";
        state.error = null;
      })
      .addCase(fetchScheduleChangeRequests.fulfilled, (state, action) => {
        state.listLoading = false;
        state.listStatus = "succeeded";
        state.items = action.payload.items;
        state.total = action.payload.total;
      })
      .addCase(fetchScheduleChangeRequests.rejected, (state, action) => {
        state.listLoading = false;
        state.listStatus = "failed";
        state.error = action.payload || action.error.message;
      })
      .addCase(reviewScheduleChangeRequest.pending, (state) => {
        state.reviewLoading = true;
        state.error = null;
      })
      .addCase(reviewScheduleChangeRequest.fulfilled, (state, action) => {
        state.reviewLoading = false;
        const updated = action.payload;
        state.items = state.items.map((item) =>
          String(item._id) === String(updated._id) ? { ...item, ...updated } : item
        );
      })
      .addCase(reviewScheduleChangeRequest.rejected, (state, action) => {
        state.reviewLoading = false;
        state.error = action.payload || action.error.message;
      });
  },
});

export const { invalidateScheduleChangeRequests } = scheduleChangeRequestSlice.actions;
export default scheduleChangeRequestSlice.reducer;
