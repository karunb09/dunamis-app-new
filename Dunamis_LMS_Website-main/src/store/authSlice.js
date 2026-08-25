// store/authSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  clearWebsiteAuthSession,
  persistWebsiteAuthSession,
} from "@/lib/authSession";
import { API_BASE, AUTH_BASE } from "@/lib/apiBase";
import { SESSION_SENTINEL } from "@/lib/authConstants";

// Base shape for the auth slice. Intentionally free of any browser-only reads
// (localStorage/cookies) so it is identical on server and client. The real
// session is seeded as Redux preloadedState from the server-read cookie
// (see lib/serverAuth.js + app/providers.js), which is what keeps the first
// render hydration-safe.
export const authInitialState = {
  loading: false,
  hydrating: true,
  error: null,
  user: null,
  token: null,
  notices: [],
  noticesLoading: false,
  forgotSent: false,
  otpVerified: false,
  passwordReset: false,
};

// Authenticated calls go through the same-origin BFF proxy, which injects the
// JWT from the httpOnly cookie. The client never holds the token, so no
// Authorization header is built here.
const BASE_URL = API_BASE;
const getAuthHeaders = () => ({}); // auth is injected server-side by the proxy

// Login — goes through the auth route handler, which sets the httpOnly cookie
// and returns only the user (never the token).
export const login = createAsyncThunk(
  "auth/login",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await fetch(`${AUTH_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.success === false)
        return rejectWithValue(data.message || "Login failed");
      return { user: data.user || null };
    } catch {
      return rejectWithValue("Unable to login");
    }
  }
);

export const hydrateSession = createAsyncThunk(
  "auth/hydrateSession",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${AUTH_BASE}/session`, { method: "GET" });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        return rejectWithValue(data.message || "Session expired");
      }
      return { user: data.user || null };
    } catch {
      return rejectWithValue("Unable to restore session");
    }
  }
);

export const logoutSession = createAsyncThunk("auth/logoutSession", async () => {
  try {
    await fetch(`${AUTH_BASE}/logout`, { method: "POST" });
  } catch {}
  clearWebsiteAuthSession();
  return true;
});

export const getUserDashboardNotices = createAsyncThunk(
  "auth/getUserDashboardNotices",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE_URL}/v1/user/notices`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        return rejectWithValue(data.message || "Failed to fetch notifications");
      }
      return data.notices || [];
    } catch {
      return rejectWithValue("Failed to fetch notifications");
    }
  }
);

export const markUserDashboardNoticeRead = createAsyncThunk(
  "auth/markUserDashboardNoticeRead",
  async (noticeId, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE_URL}/v1/user/notices/${noticeId}/read`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        return rejectWithValue(data.message || "Failed to mark notification as read");
      }
      return noticeId;
    } catch {
      return rejectWithValue("Failed to mark notification as read");
    }
  }
);

export const markAllUserDashboardNoticesRead = createAsyncThunk(
  "auth/markAllUserDashboardNoticesRead",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE_URL}/v1/user/notices/read-all`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        return rejectWithValue(data.message || "Failed to mark notifications as read");
      }
      return true;
    } catch {
      return rejectWithValue("Failed to mark notifications as read");
    }
  }
);

export const deleteUserDashboardNotice = createAsyncThunk(
  "auth/deleteUserDashboardNotice",
  async (noticeId, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE_URL}/v1/user/notices/${noticeId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        return rejectWithValue(data.message || "Failed to remove notification");
      }
      return data.noticeId || noticeId;
    } catch {
      return rejectWithValue("Failed to remove notification");
    }
  }
);

export const clearUserDashboardNotices = createAsyncThunk(
  "auth/clearUserDashboardNotices",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE_URL}/v1/user/notices`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        return rejectWithValue(data.message || "Failed to clear notifications");
      }
      return true;
    } catch {
      return rejectWithValue("Failed to clear notifications");
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
        body: JSON.stringify(payload), // { email, otp, newPassword }
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
  initialState: authInitialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.notices = [];
      state.hydrating = false;
      state.error = null;
      clearWebsiteAuthSession();
    },
    clearAuthFlags: (state) => {
      state.forgotSent = false;
      state.otpVerified = false;
      state.passwordReset = false;
      state.error = null;
    },
    updateAuthUser: (state, action) => {
      state.user = { ...(state.user || {}), ...(action.payload || {}) };
      persistWebsiteAuthSession({ user: state.user });
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
        state.hydrating = false;
        state.user = action.payload.user;
        state.token = action.payload.user ? SESSION_SENTINEL : null;
        persistWebsiteAuthSession({ user: action.payload.user });
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.hydrating = false;
        state.error = action.payload;
      })
      .addCase(hydrateSession.pending, (state) => {
        state.hydrating = true;
      })
      .addCase(hydrateSession.fulfilled, (state, action) => {
        state.hydrating = false;
        state.user = action.payload.user;
        state.token = action.payload.user ? SESSION_SENTINEL : null;
        persistWebsiteAuthSession({ user: action.payload.user });
      })
      .addCase(hydrateSession.rejected, (state) => {
        state.hydrating = false;
        state.user = null;
        state.token = null;
        state.notices = [];
        clearWebsiteAuthSession();
      })
      .addCase(logoutSession.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.notices = [];
        state.hydrating = false;
        state.error = null;
      })
      .addCase(getUserDashboardNotices.pending, (state) => {
        state.noticesLoading = true;
      })
      .addCase(getUserDashboardNotices.fulfilled, (state, action) => {
        state.noticesLoading = false;
        state.notices = action.payload || [];
      })
      .addCase(getUserDashboardNotices.rejected, (state) => {
        state.noticesLoading = false;
      })
      .addCase(markUserDashboardNoticeRead.fulfilled, (state, action) => {
        state.notices = state.notices.map((notice) =>
          (notice._id || notice.id) === action.payload ? { ...notice, isRead: true } : notice
        );
      })
      .addCase(markAllUserDashboardNoticesRead.fulfilled, (state) => {
        state.notices = state.notices.map((notice) => ({ ...notice, isRead: true }));
      })
      .addCase(deleteUserDashboardNotice.fulfilled, (state, action) => {
        state.notices = state.notices.filter(
          (notice) => (notice._id || notice.id) !== action.payload
        );
      })
      .addCase(clearUserDashboardNotices.fulfilled, (state) => {
        state.notices = [];
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

export const { logout, clearAuthFlags, updateAuthUser } = authSlice.actions;
export default authSlice.reducer;
