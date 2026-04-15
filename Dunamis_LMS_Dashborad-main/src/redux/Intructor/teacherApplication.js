import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getStoredToken } from "../../utils/authSession";
import { fetchTeachers } from "./teacherSlice";
const BASE_URL = import.meta.env.VITE_BASE_URL;

// get all applications
export const fetchAllApplications = createAsyncThunk(
  "application/fetchAll",
  async (_, thunkAPI) => {
    try {
      const token = getStoredToken();
      const res = await fetch(`${BASE_URL}/teacherApplication/get-all`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch applications");
      }
      return data.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

// Get single application
export const fetchApplicationById = createAsyncThunk(
  "application/fetchById",
  async (id, thunkAPI) => {
    try {
      const token = getStoredToken();
      const res = await fetch(
        `${BASE_URL}/teacherApplication/getApplicationById/${id}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
        }
      );
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch application");
      }
      return data.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

//Update application status
export const updateApplicationStatus = createAsyncThunk(
  "application/updateStatus",
  async ({ id, status }, thunkAPI) => {
    try {
      const token = getStoredToken();
      const res = await fetch(
        `${BASE_URL}/teacherApplication/updateStatus/${id}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({ status }), 
        }
      );
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to update status");
      }
      if (status === "selected") {
        thunkAPI.dispatch(fetchTeachers());
      }
      return {
        id,
        status,
        generatedPassword: data.credentials?.password || "",
      };
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

export const deleteApplication = createAsyncThunk(
  "application/delete",
  async (id, thunkAPI) => {
    try {
      const token = getStoredToken();
      const res = await fetch(`${BASE_URL}/teacherApplication/delete/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to delete application");
      }
      return id;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

//Slice
const applicationSlice = createSlice({
  name: "application",
  initialState: {
    loading: false,
    error: null,
    data: null,
    status: "",
    allApplications: [],
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // get all
      .addCase(fetchAllApplications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllApplications.fulfilled, (state, action) => {
        state.loading = false;
        state.allApplications = action.payload;
      })
      .addCase(fetchAllApplications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch applications";
      })

      // get by ID
      .addCase(fetchApplicationById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.data = null;
      })
      .addCase(fetchApplicationById.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.status = action.payload.status;
      })
      .addCase(fetchApplicationById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Error loading application";
      })

      // Update status
      .addCase(updateApplicationStatus.fulfilled, (state, action) => {
        const { id, status } = action.payload;
        state.status = status;

        if (state.data?._id === id) {
          state.data = { ...state.data, status };
        }

        state.allApplications = state.allApplications.map((app) =>
          app._id === id ? { ...app, status } : app
        );
      })

      // Delete application
      .addCase(deleteApplication.fulfilled, (state, action) => {
        state.allApplications = state.allApplications.filter(
          (app) => app._id !== action.payload
        );

        if (state.data?._id === action.payload) {
          state.data = null;
          state.status = "";
        }
      });
  },
});

export default applicationSlice.reducer;
