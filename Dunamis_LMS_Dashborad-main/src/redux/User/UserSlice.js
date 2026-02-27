import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_URL;

// Get user by ID
export const getUserById = createAsyncThunk(
  "user/getUserById",
  async ({ id, token }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${BASE_URL}/user/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Update user
export const updateUser = createAsyncThunk(
  "user/updateUser",
  async ({ id, userData, token }, { rejectWithValue }) => {
    try {
      const isFormData = userData instanceof FormData;
      const response = await axios.put(`${BASE_URL}/user/${id}`, userData, {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(isFormData ? {} : { "Content-Type": "application/json" }),
        },
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Change password
export const changePassword = createAsyncThunk(
  "user/changePassword",
  async ({ oldPassword, newPassword, token }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/user/change-password`,
        { oldPassword, newPassword },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Get all users
export const getAllUsers = createAsyncThunk(
  "user/getAllUsers",
  async (token, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${BASE_URL}/user/get-all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data.users;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const userSlice = createSlice({
  name: "user",
  initialState: {
    user: null,
    users: [],
    selectedUser: null,
    loading: false,
    error: null,
    success: false,
    message: "",
  },
  reducers: {
    resetUserState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.message = "";
    },
    clearSelectedUser: (state) => {
      state.selectedUser = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get user by ID
      .addCase(getUserById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(getUserById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedUser = action.payload.user;
        state.success = true;
        state.message = action.payload.message || "User fetched successfully";
      })
      .addCase(getUserById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch user";
        state.success = false;
      })

      // Update user
      .addCase(updateUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.message = "";
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.success = true;
        state.message = action.payload.message;
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to update user";
        state.success = false;
      })

      // Change password
      .addCase(changePassword.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.message = "";
      })
      .addCase(changePassword.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message =
          action.payload.message || "Password changed successfully";
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to change password";
        state.success = false;
      })

      // Get all users
      .addCase(getAllUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.message = "";
      })
      .addCase(getAllUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
        state.success = true;
        state.message = action.payload.message || "Users fetched successfully";
      })
      .addCase(getAllUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch users";
        state.success = false;
      });
  },
});

export const { resetUserState, clearSelectedUser } = userSlice.actions;
export default userSlice.reducer;
