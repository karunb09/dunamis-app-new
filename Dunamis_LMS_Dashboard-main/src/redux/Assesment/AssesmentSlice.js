import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const getAuthToken = () => {
  try {
    const token = localStorage.getItem("token");
    if (token && token !== "undefined" && token !== "null") {
      return token;
    }
    return null;
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
};

// Fetch teacher assessments
export const fetchTeacherAssessments = createAsyncThunk(
  "assessment/fetchTeacherAssessments",
  async (_, { rejectWithValue }) => {
    try {
      const token = getAuthToken();
      if (!token) {
        return rejectWithValue(
          "Authentication token not found. Please login again."
        );
      }
      const response = await axios.get(`${BASE_URL}/assessment/teacher`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch teacher assessments"
      );
    }
  },
  {
    condition: (_arg, { getState }) => {
      const { listStatus } = getState().assessment;
      return listStatus === "idle" || listStatus === "failed";
    },
  }
);

// Fetch student assessments
export const fetchStudentAssessments = createAsyncThunk(
  "assessment/fetchStudentAssessments",
  async (_, { rejectWithValue }) => {
    try {
      const token = getAuthToken();
      if (!token) {
        return rejectWithValue(
          "Authentication token not found. Please login again."
        );
      }
      const response = await axios.get(`${BASE_URL}/assessment/student`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch student assessments"
      );
    }
  }
);

// Submit an assessment (teacher only)
export const submitAssessment = createAsyncThunk(
  "assessment/submitAssessment",
  async ({ assessmentId, submissionData }, { rejectWithValue }) => {
    try {
      const token = getAuthToken();
      if (!token) {
        return rejectWithValue(
          "Authentication token not found. Please login again."
        );
      }
      const response = await axios.put(
        `${BASE_URL}/assessment/submit/${assessmentId}`,
        submissionData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to submit assessment"
      );
    }
  }
);

// Create manual assessment cycle (testing)
export const createManualCycle = createAsyncThunk(
  "assessment/createManualCycle",
  async (_, { rejectWithValue }) => {
    try {
      const token = getAuthToken();
      if (!token) {
        return rejectWithValue(
          "Authentication token not found. Please login again."
        );
      }
      const response = await axios.post(
        `${BASE_URL}/assessment/manualCycle`,
        null,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to create manual assessment cycle"
      );
    }
  }
);

// Fetch all assessments
export const fetchAllAssessments = createAsyncThunk(
  "assessment/fetchAllAssessments",
  async (_, { rejectWithValue }) => {
    try {
      const token = getAuthToken();
      if (!token) {
        return rejectWithValue(
          "Authentication token not found. Please login again."
        );
      }
      const response = await axios.get(`${BASE_URL}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch assessments"
      );
    }
  }
);

const assessmentSlice = createSlice({
  name: "assessment",
  initialState: {
    listLoading: false,
    listStatus: "idle",
    teacherAssessments: [],
    studentAssessments: [],
    allAssessments: [],
    loading: false,
    error: null,
    submitLoading: false,
    submitError: null,
  },
  reducers: {
    invalidateTeacherAssessments: (state) => {
      state.listStatus = "idle";
    },
    clearError: (state) => {
      state.error = null;
      state.submitError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Teacher assessments
      .addCase(fetchTeacherAssessments.pending, (state) => {
        state.listLoading = true;
        state.listStatus = "loading";
        state.error = null;
      })
      .addCase(fetchTeacherAssessments.fulfilled, (state, action) => {
        state.listLoading = false;
        state.listStatus = "succeeded";
        state.teacherAssessments = action.payload;
      })
      .addCase(fetchTeacherAssessments.rejected, (state, action) => {
        state.listLoading = false;
        state.listStatus = "failed";
        state.error = action.payload || action.error.message;
      })
      // Student assessments
      .addCase(fetchStudentAssessments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStudentAssessments.fulfilled, (state, action) => {
        state.loading = false;
        state.studentAssessments = action.payload.data || action.payload;
      })
      .addCase(fetchStudentAssessments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      // Submit assessment
      .addCase(submitAssessment.pending, (state) => {
        state.submitLoading = true;
        state.submitError = null;
      })
      .addCase(submitAssessment.fulfilled, (state) => {
        state.submitLoading = false;
      })
      .addCase(submitAssessment.rejected, (state, action) => {
        state.submitLoading = false;
        state.submitError = action.payload || action.error.message;
      })
      // Create manual cycle
      .addCase(createManualCycle.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createManualCycle.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(createManualCycle.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      // All assessments
      .addCase(fetchAllAssessments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllAssessments.fulfilled, (state, action) => {
        state.loading = false;
        state.allAssessments = action.payload.data || action.payload;
      })
      .addCase(fetchAllAssessments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      });
  },
});

export const { invalidateTeacherAssessments, clearError } = assessmentSlice.actions;

export default assessmentSlice.reducer;
