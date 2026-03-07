// store/authSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  clearWebsiteAuthSession,
  getWebsiteToken,
  getWebsiteUser,
  persistWebsiteAuthSession,
} from "@/lib/authSession";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

// Login
export const login = createAsyncThunk(
  "auth/login",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE_URL}/v1/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || data.success === false)
        return rejectWithValue(data.message || "Login failed");
      return { user: data.user || null, token: data.token || null };
    } catch {
      return rejectWithValue("Unable to login");
    }
  }
);

// Forgot Password
export const forgotPassword = createAsyncThunk(
  "auth/forgotPassword",
  async (email, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE_URL}/v1/user/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false)
        return rejectWithValue(data.message || "Request failed");
      return true;
    } catch {
      return rejectWithValue("Unable to send reset email");
    }
  }
);

// Verify OTP
export const verifyOtp = createAsyncThunk(
  "auth/verifyOtp",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE_URL}/v1/user/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload), // { email, otp }
      });
      const data = await res.json();
      if (!res.ok || data.success === false)
        return rejectWithValue(data.message || "Invalid OTP");
      return true;
    } catch {
      return rejectWithValue("Unable to verify OTP");
    }
  }
);

// Reset Password
export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE_URL}/v1/user/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload), // { email, otp, password }
      });
      const data = await res.json();
      if (!res.ok || data.success === false)
        return rejectWithValue(data.message || "Reset failed");
      return true;
    } catch {
      return rejectWithValue("Unable to reset password");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    loading: false,
    error: null,
    user: getWebsiteUser(),
    token: getWebsiteToken(),
    forgotSent: false,
    otpVerified: false,
    passwordReset: false,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.error = null;
      clearWebsiteAuthSession();
    },
    clearAuthFlags: (state) => {
      state.forgotSent = false;
      state.otpVerified = false;
      state.passwordReset = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        persistWebsiteAuthSession(action.payload);
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // forgot password
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.forgotSent = false;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.loading = false;
        state.forgotSent = true;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // verify otp
      .addCase(verifyOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.otpVerified = false;
      })
      .addCase(verifyOtp.fulfilled, (state) => {
        state.loading = false;
        state.otpVerified = true;
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // reset password
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.passwordReset = false;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.loading = false;
        state.passwordReset = true;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { logout, clearAuthFlags } = authSlice.actions;
export default authSlice.reducer;
