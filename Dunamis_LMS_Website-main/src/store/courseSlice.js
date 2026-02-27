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
  async () => {
    const response = await fetch(`${BASE_URL}/v1/course/get`);
    if (!response.ok) {
      throw new Error("Failed to fetch courses");
    }
    const data = await response.json();

    console.log("Fetched courses data:", data); 

    return data.data;
  }
);


export const fetchCourseById = createAsyncThunk(
  "course/fetchCourseById",
  async (courseId) => {
    const response = await fetch(`${BASE_URL}/v1/course/get/${courseId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch course with id: ${courseId}`);
    }
    const data = await response.json();
    return data;
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
        state.error = action.error.message;
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
        state.error = action.error.message;
      });
  },
});

export default courseSlice.reducer;
