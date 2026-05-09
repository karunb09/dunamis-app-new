// store/authSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  clearWebsiteAuthSession,
  getWebsiteToken,
  getWebsiteUser,
  persistWebsiteAuthSession,
} from "@/lib/authSession";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

const getAuthHeaders = () => {
  const token = getWebsiteToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

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

export const hydrateSession = createAsyncThunk(
  "auth/hydrateSession",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE_URL}/v1/user/me`, {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        return rejectWithValue(data.message || "Session expired");
      }
      return { user: data.user || null, token: data.token || getWebsiteToken() };
    } catch {
      return rejectWithValue("Unable to restore session");
    }
  }
);

export const logoutSession = createAsyncThunk("auth/logoutSession", async () => {
  try {
    await fetch(`${BASE_URL}/v1/user/logout`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
    });
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
        credentials: "include",
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
        credentials: "include",
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
        credentials: "include",
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
        credentials: "include",
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
        credentials: "include",
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
    hydrating: true,
    error: null,
    user: getWebsiteUser(),
    token: getWebsiteToken(),
    notices: [],
    noticesLoading: false,
    forgotSent: false,
    otpVerified: false,
    passwordReset: false,
  },
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
      persistWebsiteAuthSession({ token: state.token, user: state.user });
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
        state.token = action.payload.token;
        persistWebsiteAuthSession(action.payload);
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
        state.token = action.payload.token;
        persistWebsiteAuthSession(action.payload);
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
