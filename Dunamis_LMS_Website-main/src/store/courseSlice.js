import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

const initialState = {
  courses: [],
  course: null,
  loading: false,
  error: null,
};

export const fetchCourses = createAsyncThunk(
  "course/fetchCourses",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${BASE_URL}/v1/course/get`);

      if (response.status === 404) {
        return [];
      }

      if (!response.ok) {
        throw new Error("Failed to fetch courses");
      }

      const data = await response.json();
      return Array.isArray(data?.data) ? data.data : [];
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch courses");
    }
  }
);


export const fetchCourseById = createAsyncThunk(
  "course/fetchCourseById",
  async (courseId, { rejectWithValue }) => {
    try {
      const response = await fetch(`${BASE_URL}/v1/course/get/${courseId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch course with id: ${courseId}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch course");
    }
  }
);

const courseSlice = createSlice({
  name: "course",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCourses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCourses.fulfilled, (state, action) => {
        state.loading = false;
        state.courses = action.payload;
      })
      .addCase(fetchCourses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(fetchCourseById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCourseById.fulfilled, (state, action) => {
        state.loading = false;
        state.course = action.payload?.data || action.payload; 
      })
      .addCase(fetchCourseById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      });
  },
});

export default courseSlice.reducer;
