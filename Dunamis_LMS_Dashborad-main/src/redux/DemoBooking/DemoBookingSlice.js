import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_URL; 

// Book Demo Slot
export const bookDemoSlot = createAsyncThunk(
  "demoBookings/bookDemoSlot",
  async (bookingData, thunkAPI) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/demoBookings/`,
        bookingData
      );
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

// Get All Bookings
export const getAllBookings = createAsyncThunk(
  "demoBookings/getAllBookings",
  async (_, thunkAPI) => {
    try {
      const response = await axios.get(`${BASE_URL}/demoBookings/`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

// Update Booking Status
export const updateBookingStatus = createAsyncThunk(
  "demoBookings/updateBookingStatus",
  async ({ id, updatedData }, thunkAPI) => {
    try {
      const response = await axios.put(
        `${BASE_URL}/demoBookings/${id}`,
        updatedData
      );
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

// Demo Booking Slice
const demoBookingSlice = createSlice({
  name: "demoBookings",
  initialState: {
    bookings: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Book Demo Slot
      .addCase(bookDemoSlot.pending, (state) => {
        state.loading = true;
      })
      .addCase(bookDemoSlot.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings.push(action.payload); 
      })
      .addCase(bookDemoSlot.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Get All Bookings
      .addCase(getAllBookings.pending, (state) => {
        state.loading = true;
      })
      .addCase(getAllBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings = action.payload; 
      })
      .addCase(getAllBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update Booking Status
      .addCase(updateBookingStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateBookingStatus.fulfilled, (state, action) => {
        state.loading = false;
        const updatedBooking = action.payload;
        state.bookings = state.bookings.map((booking) =>
          booking.id === updatedBooking.id ? updatedBooking : booking
        );
      })
      .addCase(updateBookingStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default demoBookingSlice.reducer;
