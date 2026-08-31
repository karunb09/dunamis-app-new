import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { getStoredToken, getStoredUser } from "../../utils/authSession";

const BASE_URL = import.meta.env.VITE_BASE_URL; 

const getAuthHeaders = () => {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Book Demo Slot
export const bookDemoSlot = createAsyncThunk(
  "demoBookings/bookDemoSlot",
  async (bookingData, thunkAPI) => {
    try {
      const user = thunkAPI.getState().auth?.user || getStoredUser();
      if (String(user?.accountType || "").toLowerCase() !== "student") {
        return thunkAPI.rejectWithValue("Only student accounts can book demo slots.");
      }

      const response = await axios.post(
        `${BASE_URL}/demoBookings/`,
        bookingData,
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Get All Bookings
export const getAllBookings = createAsyncThunk(
  "demoBookings/getAllBookings",
  async (params = {}, thunkAPI) => {
    try {
      const response = await axios.get(`${BASE_URL}/demoBookings/`, {
        params,
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || error.message);
    }
  },
  {
    condition: (_arg, { getState }) => {
      const { listStatus } = getState().demoBookings;
      return listStatus === "idle" || listStatus === "failed";
    },
  }
);

// Update Booking Status
export const updateBookingStatus = createAsyncThunk(
  "demoBookings/updateBookingStatus",
  async ({ id, updatedData }, thunkAPI) => {
    try {
      const response = await axios.put(
        `${BASE_URL}/demoBookings/${id}`,
        updatedData,
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Move a demo to another slot. Picking a slot owned by a different instructor
// reassigns it — the server derives that, there is no separate flag.
export const rescheduleBooking = createAsyncThunk(
  "demoBookings/reschedule",
  async ({ id, slotId, teacherId, reason }, thunkAPI) => {
    try {
      const response = await axios.patch(
        `${BASE_URL}/demoBookings/${id}/reschedule`,
        { slotId, teacherId, reason },
        { headers: getAuthHeaders() }
      );
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const cancelBooking = createAsyncThunk(
  "demoBookings/cancel",
  async ({ id, reason }, thunkAPI) => {
    try {
      const response = await axios.patch(
        `${BASE_URL}/demoBookings/${id}/cancel`,
        { reason },
        { headers: getAuthHeaders() }
      );
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Demo Booking Slice
const demoBookingSlice = createSlice({
  name: "demoBookings",
  initialState: {
    listLoading: false,
    listStatus: "idle",
    bookings: [],
    loading: false,
    error: null,
  },
  reducers: {
    invalidateBookings: (state) => {
      state.listStatus = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      // Book Demo Slot
      .addCase(bookDemoSlot.pending, (state) => {
        state.loading = true;
      })
      .addCase(bookDemoSlot.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.booking) {
          state.bookings.unshift(action.payload.booking);
        } else if (action.payload) {
          state.bookings.unshift(action.payload);
        }
      })
      .addCase(bookDemoSlot.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Get All Bookings
      .addCase(getAllBookings.pending, (state) => {
        state.listLoading = true;
        state.listStatus = "loading";
      })
      .addCase(getAllBookings.fulfilled, (state, action) => {
        state.listLoading = false;
        state.listStatus = "succeeded";
        state.bookings = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(getAllBookings.rejected, (state, action) => {
        state.listLoading = false;
        state.listStatus = "failed";
        state.error = action.payload;
      })

      // Update Booking Status
      .addCase(updateBookingStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateBookingStatus.fulfilled, (state, action) => {
        state.loading = false;
        const updatedBooking = action.payload?.booking || action.payload;
        state.bookings = state.bookings.map((booking) =>
          (booking.id || booking._id) === (updatedBooking.id || updatedBooking._id)
            ? updatedBooking
            : booking
        );
      })
      .addCase(updateBookingStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { invalidateBookings } = demoBookingSlice.actions;
export default demoBookingSlice.reducer;
