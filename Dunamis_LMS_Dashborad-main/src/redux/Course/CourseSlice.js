import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "../../api/axios";

// Get all courses
export const getCourses = createAsyncThunk(
  "course/getCourses",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get("/course/get");
      return Array.isArray(response.data)
        ? response.data
        : response.data.data || [];
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// Get single course
export const getCourseDetails = createAsyncThunk(
  "course/getCourseDetails",
  async (courseId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/course/get/${courseId}`);
      return response.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// Create course
export const createCourse = createAsyncThunk(
  "course/createCourse",
  async (formData, { rejectWithValue }) => {
    try {
      const response = await axios.post("/course/create", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// Delete course
export const deleteCourse = createAsyncThunk(
  "course/deleteCourse",
  async (courseId, { rejectWithValue }) => {
    try {
      const response = await axios.delete(`/course/delete/${courseId}`);
      return courseId;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to delete course");
    }
  }
);

// Update course
export const updateCourse = createAsyncThunk(
  "course/updateCourse",
  async ({ courseId, updates }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`/course/update/${courseId}`, updates, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

const initialState = {
  course: {
    info: {},
    instructors: [],
    pricing: {},
    content: [],
    media: {},
  },
  courseList: [],
  status: "idle",
  error: null,
};

const courseSlice = createSlice({
  name: "course",
  initialState,
  reducers: {
    updateCourseInfo: (state, action) => {
      state.course.info = action.payload;
    },
    updateCourseInstructors: (state, action) => {
      state.course.instructors = action.payload;
    },
    updateCoursePricing: (state, action) => {
      state.course.pricing = action.payload;
    },
    updateCourseContent: (state, action) => {
      state.course.content = action.payload;
    },
    updateCourseMedia: (state, action) => {
      state.course.media = action.payload;
    },
    resetCourse: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(getCourses.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(getCourses.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.courseList = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(getCourses.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(getCourseDetails.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(getCourseDetails.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.course.info = action.payload;
      })
      .addCase(getCourseDetails.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(createCourse.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(createCourse.fulfilled, (state, action) => {
        state.status = "succeeded";
        const createdCourse = action.payload?.data;
        if (createdCourse) {
          state.course.info = createdCourse;
          state.courseList = [createdCourse, ...state.courseList];
        }
      })
      .addCase(createCourse.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(updateCourse.pending, (state) => {
        state.status = "loading";
      })
      .addCase(updateCourse.fulfilled, (state, action) => {
        state.status = "succeeded";
        const updated = action.payload?.data;
        if (!updated) {
          return;
        }

        state.course.info = updated;
        const index = state.courseList.findIndex((c) => c._id === updated._id);
        if (index !== -1) {
          state.courseList[index] = updated;
        }
      })
      .addCase(updateCourse.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(deleteCourse.pending, (state) => {
        state.status = "loading";
      })
      .addCase(deleteCourse.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.courseList = state.courseList.filter(
          (course) => course._id !== action.payload
        );
      })
      .addCase(deleteCourse.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export const {
  updateCourseInfo,
  updateCourseInstructors,
  updateCoursePricing,
  updateCourseContent,
  updateCourseMedia,
  resetCourse,
} = courseSlice.actions;

export default courseSlice.reducer;
