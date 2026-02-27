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

// NEW: Fetch student's assignment information
export const getStudentAssignments = createAsyncThunk(
  "assignment/getStudent",
  async (_, { rejectWithValue }) => {
    try {
      const token = getAuthToken();
      if (!token) {
        return rejectWithValue(
          "Authentication token not found. Please login again."
        );
      }
      const response = await axios.get(
        `${BASE_URL}/assignment/student`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch student assignments"
      );
    }
  }
);

export const createAssignment = createAsyncThunk(
  "assignment/create",
  async (assignmentData, { rejectWithValue }) => {
    try {
      const token = getAuthToken();
      if (!token) {
        return rejectWithValue(
          "Authentication token not found. Please login again."
        );
      }
      const response = await axios.post(
        `${BASE_URL}/assignment/create`,
        assignmentData,
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
          "Failed to create assignment"
      );
    }
  }
);

export const submitAssignment = createAsyncThunk(
  "assignment/submit",
  async (submissionData, { rejectWithValue }) => {
    try {
      const token = getAuthToken();
      if (!token) {
        return rejectWithValue(
          "Authentication token not found. Please login again."
        );
      }
      const response = await axios.post(
        `${BASE_URL}/assignment/submit`,
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
          "Failed to submit assignment"
      );
    }
  }
);

export const reviewSubmission = createAsyncThunk(
  "assignment/review",
  async (reviewData, { rejectWithValue }) => {
    try {
      const token = getAuthToken();
      if (!token) {
        return rejectWithValue(
          "Authentication token not found. Please login again."
        );
      }
      const response = await axios.put(
        `${BASE_URL}/assignment/review`,
        reviewData,
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
          "Failed to review assignment"
      );
    }
  }
);

export const getAssignmentsByStatus = createAsyncThunk(
  "assignment/getByStatus",
  async (status, { rejectWithValue }) => {
    try {
      const token = getAuthToken();
      if (!token) {
        return rejectWithValue(
          "Authentication token not found. Please login again."
        );
      }
      const response = await axios.get(`${BASE_URL}/assignment/status`, {
        params: status ? { status } : {},
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return { status, data: response.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch assignments"
      );
    }
  }
);

const assignmentSlice = createSlice({
  name: "assignment",
  initialState: {
    assignments: [],
    studentAssignments: [], // NEW: Store student-specific assignments
    selectedAssignment: null,
    loading: false,
    error: null,
    studentLoading: false, // NEW: Loading state for student assignments
    studentError: null, // NEW: Error state for student assignments
    submitLoading: false,
    submitError: null,
    reviewLoading: false,
    reviewError: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.submitError = null;
      state.reviewError = null;
      state.studentError = null; // NEW
    },
    setSelectedAssignment: (state, action) => {
      state.selectedAssignment = action.payload;
    },
    clearSelectedAssignment: (state) => {
      state.selectedAssignment = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // NEW: Handle getStudentAssignments thunk
      .addCase(getStudentAssignments.pending, (state) => {
        state.studentLoading = true;
        state.studentError = null;
      })
      .addCase(getStudentAssignments.fulfilled, (state, action) => {
        state.studentLoading = false;
        // Handle response structure - adjust based on your API response
        if (action.payload && action.payload.data) {
          state.studentAssignments = action.payload.data.all || 
                                     action.payload.data || 
                                     [];
        } else if (Array.isArray(action.payload)) {
          state.studentAssignments = action.payload;
        } else {
          state.studentAssignments = [];
        }
      })
      .addCase(getStudentAssignments.rejected, (state, action) => {
        state.studentLoading = false;
        state.studentError = action.payload || action.error.message;
        state.studentAssignments = [];
      })
      // Existing createAssignment handlers
      .addCase(createAssignment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAssignment.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.data) {
          state.assignments.push(action.payload.data);
        }
      })
      .addCase(createAssignment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      // Existing submitAssignment handlers
      .addCase(submitAssignment.pending, (state) => {
        state.submitLoading = true;
        state.submitError = null;
      })
      .addCase(submitAssignment.fulfilled, (state, action) => {
        state.submitLoading = false;
        const index = state.assignments.findIndex(
          (a) => a._id === action.payload.data._id
        );
        if (index !== -1) {
          state.assignments[index] = action.payload.data;
        }
        // Also update in studentAssignments if present
        const studentIndex = state.studentAssignments.findIndex(
          (a) => a._id === action.payload.data._id
        );
        if (studentIndex !== -1) {
          state.studentAssignments[studentIndex] = action.payload.data;
        }
      })
      .addCase(submitAssignment.rejected, (state, action) => {
        state.submitLoading = false;
        state.submitError = action.payload || action.error.message;
      })
      // Existing reviewSubmission handlers
      .addCase(reviewSubmission.pending, (state) => {
        state.reviewLoading = true;
        state.reviewError = null;
      })
      .addCase(reviewSubmission.fulfilled, (state, action) => {
        state.reviewLoading = false;
        const index = state.assignments.findIndex(
          (a) => a._id === action.payload.data._id
        );
        if (index !== -1) {
          state.assignments[index] = action.payload.data;
        }
        // Also update in studentAssignments if present
        const studentIndex = state.studentAssignments.findIndex(
          (a) => a._id === action.payload.data._id
        );
        if (studentIndex !== -1) {
          state.studentAssignments[studentIndex] = action.payload.data;
        }
      })
      .addCase(reviewSubmission.rejected, (state, action) => {
        state.reviewLoading = false;
        state.reviewError = action.payload || action.error.message;
      })
      // Existing getAssignmentsByStatus handlers
      .addCase(getAssignmentsByStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAssignmentsByStatus.fulfilled, (state, action) => {
        state.loading = false;
        const apiResponse = action.payload.data;
        if (apiResponse && apiResponse.success && apiResponse.data) {
          state.assignments = apiResponse.data.all || [];
        } else {
          state.assignments = [];
        }
      })
      .addCase(getAssignmentsByStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
        state.assignments = [];
      });
  },
});

export const { clearError, setSelectedAssignment, clearSelectedAssignment } =
  assignmentSlice.actions;

export default assignmentSlice.reducer;
