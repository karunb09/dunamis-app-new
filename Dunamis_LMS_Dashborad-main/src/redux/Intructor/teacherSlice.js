import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { getStoredToken } from "../../utils/authSession";

const BASE_URL = import.meta.env.VITE_BASE_URL;

// Fetch all teachers
export const fetchTeachers = createAsyncThunk(
  "teachers/fetchTeachers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${BASE_URL}/teachers/`, {
        params: { limit: 1000 },
      });
      return response.data.data || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const createTeacher = createAsyncThunk(
  "teachers/createTeacher",
  async (teacherData, { rejectWithValue }) => {
    try {
      const token = getStoredToken();
      const response = await axios.post(`${BASE_URL}/teachers/`, teacherData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Fetch teacher by ID
export const fetchTeacherById = createAsyncThunk(
  "teachers/fetchTeacherById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${BASE_URL}/teachers/${id}`);
      return response.data; // { success, data }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Update teacher by ID
export const updateTeacher = createAsyncThunk(
  "teachers/updateTeacher",
  async ({ id, updatedData }, { rejectWithValue }) => {
    try {
      const token = getStoredToken();
      const response = await axios.put(`${BASE_URL}/teachers/${id}`, updatedData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Add bank details to a teacher by ID
export const addBankDetails = createAsyncThunk(
  "teachers/addBankDetails",
  async ({ id, bankDetails }, { rejectWithValue }) => {
    try {
      const token = getStoredToken();
      const response = await axios.put(`${BASE_URL}/teachers/${id}/bank-details`, bankDetails, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const teacherSlice = createSlice({
  name: "teachers",
  initialState: {
    teachers: [],
    selectedTeacher: null,
    // NEW: per-id cached details for all fetched teachers
    byId: {},           // { [id]: data }
    loadingById: {},    // { [id]: boolean }
    errorById: {},      // { [id]: string | null }
    loading: false,
    error: null,
  },
  extraReducers: (builder) => {
    builder
      // Fetch all teachers
      .addCase(fetchTeachers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeachers.fulfilled, (state, action) => {
        state.loading = false;
        state.teachers = action.payload;
      })
      .addCase(fetchTeachers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Create teacher
      .addCase(createTeacher.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTeacher.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(createTeacher.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch teacher by ID (per-id flags + cache) — preserves selectedTeacher
      .addCase(fetchTeacherById.pending, (state, action) => {
        state.loading = true;             // keep existing global loading
        state.error = null;               // keep existing global error clear
        const id = action.meta.arg;       // NEW
        state.loadingById[id] = true;     // NEW
        state.errorById[id] = null;       // NEW
      })
      .addCase(fetchTeacherById.fulfilled, (state, action) => {
        state.loading = false;
        const data = action.payload?.data;          // API: { success, data }
        state.selectedTeacher = data;               // keep existing behavior

        // NEW: write-through cache
        const tid = data?.id || data?._id;
        if (tid) {
          state.byId[tid] = data;
          state.loadingById[tid] = false;
          state.errorById[tid] = null;
        }
      })
      .addCase(fetchTeacherById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;

        // NEW: per-id error
        const id = action.meta.arg;
        state.loadingById[id] = false;
        state.errorById[id] = action.payload || action.error.message;
      })

      // Update teacher
      .addCase(updateTeacher.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTeacher.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedTeacher = action.payload;

        const index = state.teachers.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) {
          state.teachers[index] = action.payload;
        }

        // NEW: keep cache in sync if id exists
        const updatedId = action.payload?.id || action.payload?._id;
        if (updatedId) {
          state.byId[updatedId] = action.payload;
        }
      })
      .addCase(updateTeacher.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Add bank details
      .addCase(addBankDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addBankDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedTeacher = action.payload;

        const index = state.teachers.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) {
          state.teachers[index] = action.payload;
        }

        // NEW: keep cache in sync if id exists
        const updatedId = action.payload?.id || action.payload?._id;
        if (updatedId) {
          state.byId[updatedId] = action.payload;
        }
      })
      .addCase(addBankDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      });
  },
});

export default teacherSlice.reducer;
