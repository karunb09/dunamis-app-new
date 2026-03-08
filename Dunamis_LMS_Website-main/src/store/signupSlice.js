// store/signupSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

//  Send OTP API
export const sendOtp = createAsyncThunk(
  "signup/sendOtp",
  async (email, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE_URL}/v1/student/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      // return true;
      if (!res.ok || !data.success) return rejectWithValue(data.message);
      return true;
    } catch (err) {
      return rejectWithValue("Something went wrong while sending OTP");
    }
  }
);

//  Create Student API
export const createStudent = createAsyncThunk(
  "signup/createStudent",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE_URL}/v1/student/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return rejectWithValue(data.message);
      return true;
    } catch (err) {
      return rejectWithValue("Something went wrong while creating account");
    }
  }
);

const signupSlice = createSlice({
  name: "signup",
  initialState: {
    step: 1,
    loading: false,
    otpStatus: "idle",
    createStatus: "idle",
    error: null,
    otpSent: false,
    accountCreated: false,
  },
  reducers: {
    setStep: (state, action) => {
      state.step = action.payload;
    },
    resetSignup: () => ({
      step: 1,
      loading: false,
      otpStatus: "idle",
      createStatus: "idle",
      error: null,
      otpSent: false,
      accountCreated: false,
    }),
  },
  extraReducers: (builder) => {
    builder
      // Send OTP
      .addCase(sendOtp.pending, (state) => {
        state.loading = true;
        state.otpStatus = "loading";
        state.error = null;
      })
      .addCase(sendOtp.fulfilled, (state) => {
        state.loading = false;
        state.otpStatus = "succeeded";
        state.otpSent = true;
      })
      .addCase(sendOtp.rejected, (state, action) => {
        state.loading = false;
        state.otpStatus = "failed";
        state.error = action.payload;
      })

      // Create Student
      .addCase(createStudent.pending, (state) => {
        state.loading = true;
        state.createStatus = "loading";
        state.error = null;
      })
      .addCase(createStudent.fulfilled, (state) => {
        state.loading = false;
        state.createStatus = "succeeded";
        state.accountCreated = true;
        state.step = 3; 
      })
      .addCase(createStudent.rejected, (state, action) => {
        state.loading = false;
        state.createStatus = "failed";
        state.error = action.payload;
      });
  },
});

export const { setStep, resetSignup } = signupSlice.actions;
export default signupSlice.reducer;
