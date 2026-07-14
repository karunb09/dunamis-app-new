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

// submitAttendanceHomework
export const submitAttendanceHomework = createAsyncThunk(
  "attendanceHomework/submit",
  async (attendanceData, { rejectWithValue }) => {
    try {
      const token = getAuthToken();
      if (!token) {
        return rejectWithValue(
          "Authentication token not found. Please login again."
        );
      }
      const response = await axios.post(
        `${BASE_URL}/attendance-homework/`,
        attendanceData,
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
          "Failed to submit attendance and homework"
      );
    }
  }
);

// getTeacherClassAttendance (roster + existing submission for one slot)
export const getTeacherClassAttendance = createAsyncThunk(
  "attendanceHomework/getClassAttendance",
  async (slotId, { rejectWithValue }) => {
    try {
      const token = getAuthToken();
      if (!token) return rejectWithValue("Authentication token not found. Please login again.");
      const response = await axios.get(
        `${BASE_URL}/attendance-homework/teacher/class/${slotId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || "Failed to load class details"
      );
    }
  }
);

// updateAttendanceHomework (edit a recorded class)
export const updateAttendanceHomework = createAsyncThunk(
  "attendanceHomework/update",
  async ({ slotId, payload }, { rejectWithValue }) => {
    try {
      const token = getAuthToken();
      if (!token) return rejectWithValue("Authentication token not found. Please login again.");
      const response = await axios.put(
        `${BASE_URL}/attendance-homework/teacher/class/${slotId}`,
        payload,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || "Failed to update attendance and homework"
      );
    }
  }
);

// getTeacherHomeworkHistory
export const getTeacherHomeworkHistory = createAsyncThunk(
  "attendanceHomework/getTeacherHistory",
  async (_, { rejectWithValue }) => {
    try {
      const token = getAuthToken();
      if (!token) {
        return rejectWithValue(
          "Authentication token not found. Please login again."
        );
      }
      const response = await axios.get(
        `${BASE_URL}/attendance-homework/teacher/history`,
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
          "Failed to fetch homework history"
      );
    }
  }
);

// getStudentHomeworkDashboard
export const getStudentHomeworkDashboard = createAsyncThunk(
  "attendanceHomework/getStudentDashboard",
  async (_, { rejectWithValue }) => {
    try {
      const token = getAuthToken();
      if (!token) {
        return rejectWithValue(
          "Authentication token not found. Please login again."
        );
      }
      const response = await axios.get(
        `${BASE_URL}/attendance-homework/student/homework`,
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
          "Failed to fetch student homework"
      );
    }
  }
);

// getTeacherPastClasses
export const getTeacherPastClasses = createAsyncThunk(
  "attendanceHomework/getPastClasses",
  async (params = {}, { rejectWithValue }) => {
    try {
      const token = getAuthToken();
      if (!token) return rejectWithValue("Authentication token not found. Please login again.");
      const response = await axios.get(
        `${BASE_URL}/attendance-homework/teacher/past-classes`,
        { headers: { Authorization: `Bearer ${token}` }, params }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || "Failed to fetch past classes"
      );
    }
  }
);

// getTeacherCourseClasses
export const getTeacherCourseClasses = createAsyncThunk(
  "attendanceHomework/getCourseClasses",
  async (_, { rejectWithValue }) => {
    try {
      const token = getAuthToken();
      if (!token) return rejectWithValue("Authentication token not found. Please login again.");
      const response = await axios.get(
        `${BASE_URL}/attendance-homework/teacher/course-classes`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || "Failed to fetch your courses"
      );
    }
  }
);

const attendanceHomeworkSlice = createSlice({
  name: "attendanceHomework",
  initialState: {
    homeworkHistory: [],
    studentHomework: [],
    pastClasses: [],
    courseClasses: [],
    classDetail: null,
    classDetailLoading: false,
    classDetailError: null,
    selectedRecord: null,
    loading: false,
    error: null,
    classesLoading: false,
    classesError: null,
    submitLoading: false,
    submitError: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.submitError = null;
    },
    setSelectedRecord: (state, action) => {
      state.selectedRecord = action.payload;
    },
    clearSelectedRecord: (state) => {
      state.selectedRecord = null;
    },
    clearClassDetail: (state) => {
      state.classDetail = null;
      state.classDetailError = null;
      state.submitError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitAttendanceHomework.pending, (state) => {
        state.submitLoading = true;
        state.submitError = null;
      })
      .addCase(submitAttendanceHomework.fulfilled, (state, action) => {
        state.submitLoading = false;
        if (action.payload.data) {
          state.homeworkHistory.unshift(action.payload.data);
        }
      })
      .addCase(submitAttendanceHomework.rejected, (state, action) => {
        state.submitLoading = false;
        state.submitError = action.payload || action.error.message;
      })
      .addCase(getTeacherClassAttendance.pending, (state) => {
        state.classDetailLoading = true;
        state.classDetailError = null;
        state.classDetail = null;
      })
      .addCase(getTeacherClassAttendance.fulfilled, (state, action) => {
        state.classDetailLoading = false;
        state.classDetail = action.payload.data || null;
      })
      .addCase(getTeacherClassAttendance.rejected, (state, action) => {
        state.classDetailLoading = false;
        state.classDetailError = action.payload || action.error.message;
      })
      .addCase(updateAttendanceHomework.pending, (state) => {
        state.submitLoading = true;
        state.submitError = null;
      })
      .addCase(updateAttendanceHomework.fulfilled, (state) => {
        state.submitLoading = false;
      })
      .addCase(updateAttendanceHomework.rejected, (state, action) => {
        state.submitLoading = false;
        state.submitError = action.payload || action.error.message;
      })
      .addCase(getTeacherHomeworkHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getTeacherHomeworkHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.homeworkHistory = action.payload.data || action.payload;
      })
      .addCase(getTeacherHomeworkHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(getStudentHomeworkDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getStudentHomeworkDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.studentHomework = action.payload.data || action.payload;
      })
      .addCase(getStudentHomeworkDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(getTeacherPastClasses.pending, (state) => {
        state.classesLoading = true;
        state.classesError = null;
      })
      .addCase(getTeacherPastClasses.fulfilled, (state, action) => {
        state.classesLoading = false;
        state.pastClasses = action.payload.data || [];
      })
      .addCase(getTeacherPastClasses.rejected, (state, action) => {
        state.classesLoading = false;
        state.classesError = action.payload || action.error.message;
      })
      .addCase(getTeacherCourseClasses.pending, (state) => {
        state.classesLoading = true;
        state.classesError = null;
      })
      .addCase(getTeacherCourseClasses.fulfilled, (state, action) => {
        state.classesLoading = false;
        state.courseClasses = action.payload.data || [];
      })
      .addCase(getTeacherCourseClasses.rejected, (state, action) => {
        state.classesLoading = false;
        state.classesError = action.payload || action.error.message;
      });
  },
});

export const { clearError, setSelectedRecord, clearSelectedRecord, clearClassDetail } =
  attendanceHomeworkSlice.actions;

export default attendanceHomeworkSlice.reducer;
