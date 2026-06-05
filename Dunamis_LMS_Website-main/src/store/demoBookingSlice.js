import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { API_BASE } from "@/lib/apiBase";

// Routes through the BFF proxy; the proxy injects auth from the httpOnly cookie
// when a session exists (demo booking works for anonymous users too).
const BASE_URL = API_BASE;
const getAuthHeaders = () => ({});

export const createDemoBooking = createAsyncThunk(
  "demoBooking/createDemoBooking",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await axios.post(
        `${BASE_URL}/v1/demoBookings/`,
        payload,
        {
          withCredentials: true,
          headers: getAuthHeaders(),
        }
      );
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to create demo booking"
      );
    }
  }
);

export const fetchAvailableSlots = createAsyncThunk(
  "demoBooking/fetchAvailableSlots",
  async (params, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${BASE_URL}/v1/slots/available`, {
        params,
        withCredentials: true,
        headers: getAuthHeaders(),
      });
      if (Array.isArray(res.data?.slots)) return res.data.slots;
      if (Array.isArray(res.data?.data?.slots)) return res.data.data.slots;
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data?.data)) return res.data.data;
      return [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to fetch slots"
      );
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
  availableSlots: [],
  status: "idle",
  createStatus: "idle",
  updateStatus: "idle",
  slotsStatus: "idle",
  error: null,
  slotsError: null,
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
      state.slotsError = null;
      if (state.status !== "loading") state.status = "idle";
      if (state.createStatus !== "loading") state.createStatus = "idle";
      if (state.updateStatus !== "loading") state.updateStatus = "idle";
      if (state.slotsStatus !== "loading") state.slotsStatus = "idle";
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
      .addCase(fetchAvailableSlots.pending, (state) => {
        state.slotsStatus = "loading";
        state.slotsError = null;
      })
      .addCase(fetchAvailableSlots.fulfilled, (state, action) => {
        state.slotsStatus = "succeeded";
        state.availableSlots = Array.isArray(action.payload)
          ? action.payload
          : [];
      })
      .addCase(fetchAvailableSlots.rejected, (state, action) => {
        state.slotsStatus = "failed";
        state.slotsError =
          action.payload || action.error.message || "Failed to fetch slots";
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
