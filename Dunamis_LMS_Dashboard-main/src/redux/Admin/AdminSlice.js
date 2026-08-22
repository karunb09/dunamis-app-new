import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosAuth from "../../utils/axiosAuth";

const BASE_URL = import.meta.env.VITE_BASE_URL;

// Fetch all admins
export const fetchAdmins = createAsyncThunk(
  "admin/fetchAdmins",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosAuth.get(`${BASE_URL}/admin/get-all-admin`);
      if (!data.success) return rejectWithValue(data.message);
      return data.admins;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Fetch admin by ID
export const fetchAdminById = createAsyncThunk(
  "admin/fetchAdminById",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await axiosAuth.get(`${BASE_URL}/admin/${id}`);
      if (!data.success) return rejectWithValue(data.message);
      return data.admin;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Create admin
export const createAdmin = createAsyncThunk(
  "admin/createAdmin",
  async (adminData, { rejectWithValue }) => {
    try {
      const { data } = await axiosAuth.post(`${BASE_URL}/admin/create`, adminData);
      if (!data.success) return rejectWithValue(data.message);
      return { ...data.admin, userId: data.user };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Update admin
export const updateAdmin = createAsyncThunk(
  "admin/updateAdmin",
  async ({ id, adminData }, { rejectWithValue }) => {
    try {
      const { data } = await axiosAuth.put(`${BASE_URL}/admin/${id}`, adminData);
      if (!data.success) return rejectWithValue(data.message);
      return data.admin;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Delete admin
export const deleteAdmin = createAsyncThunk(
  "admin/deleteAdmin",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await axiosAuth.delete(`${BASE_URL}/admin/${id}`);
      if (!data.success) return rejectWithValue(data.message);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const adminSlice = createSlice({
  name: "admin",
  initialState: {
    admins: [],
    selectedAdmin: null,
    loading: false,
    listStatus: "idle",
    error: null,
    successMessage: null,
  },
  reducers: {
    clearSelectedAdmin(state) {
      state.selectedAdmin = null;
    },
    clearError(state) {
      state.error = null;
    },
    clearSuccessMessage(state) {
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchAdmins
      .addCase(fetchAdmins.pending, (state) => {
        state.loading = true;
        state.listStatus = "loading";
        state.error = null;
        state.successMessage = null;
      })
      .addCase(fetchAdmins.fulfilled, (state, action) => {
        state.loading = false;
        state.listStatus = "succeeded";
        state.admins = action.payload;
      })
      .addCase(fetchAdmins.rejected, (state, action) => {
        state.loading = false;
        state.listStatus = "failed";
        state.error = action.payload;
      })

      // fetchAdminById
      .addCase(fetchAdminById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(fetchAdminById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedAdmin = action.payload;
      })
      .addCase(fetchAdminById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // createAdmin
      .addCase(createAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(createAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.admins.push(action.payload);
        state.successMessage = "Admin created successfully";
      })
      .addCase(createAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // updateAdmin
      .addCase(updateAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(updateAdmin.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.admins.findIndex(
          (admin) => admin._id === action.payload._id
        );
        if (index !== -1) {
          state.admins[index] = action.payload;
        }
        if (
          state.selectedAdmin &&
          state.selectedAdmin._id === action.payload._id
        ) {
          state.selectedAdmin = action.payload;
        }
        state.successMessage = "Admin updated successfully";
      })
      .addCase(updateAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // deleteAdmin
      .addCase(deleteAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(deleteAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.admins = state.admins.filter(
          (admin) => admin._id !== action.payload
        );
        if (state.selectedAdmin && state.selectedAdmin._id === action.payload) {
          state.selectedAdmin = null;
        }
        state.successMessage = "Admin deleted successfully";
      })
      .addCase(deleteAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearSelectedAdmin, clearError, clearSuccessMessage } =
  adminSlice.actions;
export default adminSlice.reducer;
