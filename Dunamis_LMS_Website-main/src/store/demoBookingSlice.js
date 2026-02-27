import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

export const createDemoBooking = createAsyncThunk(
  "demoBooking/createDemoBooking",
  async ({ slotId, courseId }, { rejectWithValue }) => {
    try {
      const res = await axios.post(
        `${BASE_URL}/v1/demoBookings/`,
        { slotId, courseId },
        { withCredentials: true }
      );
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const getDemoBookings = createAsyncThunk(
  "demoBooking/getDemoBookings",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${BASE_URL}/v1/demoBookings/`, {
        withCredentials: true,
      });
      return Array.isArray(res.data) ? res.data : [];
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateDemoBooking = createAsyncThunk(
  "demoBooking/updateDemoBooking",
  async ({ id, update }, { rejectWithValue }) => {
    try {
      const res = await axios.put(`${BASE_URL}/v1/demoBookings/${id}`, update, {
        withCredentials: true,
      });
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const initialState = {
  items: [],
  current: null,
  status: "idle",
  createStatus: "idle",
  updateStatus: "idle",
  error: null,
  success: null,
  message: null,
};

const demoBookingSlice = createSlice({
  name: "demoBooking",
  initialState,
  reducers: {
    clearDemoBookingFlags: (state) => {
      state.error = null;
      state.success = null;
      state.message = null;
      if (state.status !== "loading") state.status = "idle";
      if (state.createStatus !== "loading") state.createStatus = "idle";
      if (state.updateStatus !== "loading") state.updateStatus = "idle";
    },
    setCurrentBooking: (state, action) => {
      state.current = action.payload || null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createDemoBooking.pending, (state) => {
        state.createStatus = "loading";
        state.error = null;
        state.success = null;
        state.message = null;
      })
      .addCase(createDemoBooking.fulfilled, (state, action) => {
        state.createStatus = "succeeded";
        const booking = action.payload?.booking || null;
        const message =
          action.payload?.message || "Demo slot booked successfully";
        if (booking) {
          state.items.unshift(booking);
          state.current = booking;
        }
        state.success = true;
        state.message = message;
      })
      .addCase(createDemoBooking.rejected, (state, action) => {
        state.createStatus = "failed";
        state.error =
          action.payload ||
          action.error.message ||
          "Failed to create demo booking";
      })
      .addCase(getDemoBookings.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(getDemoBookings.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(getDemoBookings.rejected, (state, action) => {
        state.status = "failed";
        state.error =
          action.payload ||
          action.error.message ||
          "Failed to fetch demo bookings";
      })
      .addCase(updateDemoBooking.pending, (state) => {
        state.updateStatus = "loading";
        state.error = null;
        state.success = null;
        state.message = null;
      })
      .addCase(updateDemoBooking.fulfilled, (state, action) => {
        state.updateStatus = "succeeded";
        const updated = action.payload?.booking || null;
        const message =
          action.payload?.message || "Booking updated successfully";
        if (updated?._id) {
          const idx = state.items.findIndex((b) => b._id === updated._id);
          if (idx !== -1) state.items[idx] = updated;
          if (state.current?._id === updated._id) state.current = updated;
        }
        state.success = true;
        state.message = message;
      })
      .addCase(updateDemoBooking.rejected, (state, action) => {
        state.updateStatus = "failed";
        state.error =
          action.payload || action.error.message || "Failed to update booking";
      });
  },
});

export const { clearDemoBookingFlags, setCurrentBooking } =
  demoBookingSlice.actions;
export default demoBookingSlice.reducer;
