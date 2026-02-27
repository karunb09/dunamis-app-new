import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_URL;

// Create Feedback
export const createFeedback = createAsyncThunk(
  "feedback/createFeedback",
  async (feedbackData, thunkAPI) => {
    try {
      const response = await axios.post(`${BASE_URL}/feedback/`, feedbackData);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Get All Feedback for Course
export const getFeedbackByCourse = createAsyncThunk(
  "feedback/getFeedbackByCourse",
  async (courseId, thunkAPI) => {
    try {
      const response = await axios.get(
        `${BASE_URL}/feedback/course/${courseId}`
      );
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Get All Feedback for Teacher
export const getFeedbackByTeacher = createAsyncThunk(
  "feedback/getFeedbackByTeacher",
  async ({ teacherId, token }, thunkAPI) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const response = await axios.get(
        `${BASE_URL}/feedback/teacher/${teacherId}`,
        config
      );
      // return the feedbacks array directly
      return response.data.feedbacks;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Delete Feedback
export const deleteFeedback = createAsyncThunk(
  "feedback/deleteFeedback",
  async (feedbackId, thunkAPI) => {
    try {
      const response = await axios.delete(`${BASE_URL}/feedback/${feedbackId}`);
      return { id: feedbackId, ...response.data };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Feedback Slice
const feedbackSlice = createSlice({
  name: "feedback",
  initialState: {
    feedbackList: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Create Feedback
      .addCase(createFeedback.pending, (state) => {
        state.loading = true;
      })
      .addCase(createFeedback.fulfilled, (state, action) => {
        state.loading = false;
        state.feedbackList.push(action.payload);
      })
      .addCase(createFeedback.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Get Feedback by Course
      .addCase(getFeedbackByCourse.pending, (state) => {
        state.loading = true;
      })
      .addCase(getFeedbackByCourse.fulfilled, (state, action) => {
        state.loading = false;
        state.feedbackList = action.payload.feedbacks || [];
      })
      .addCase(getFeedbackByCourse.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Get Feedback by Teacher
      .addCase(getFeedbackByTeacher.pending, (state) => {
        state.loading = true;
      })
      .addCase(getFeedbackByTeacher.fulfilled, (state, action) => {
        state.loading = false;
        state.feedbackList = action.payload;
      })
      .addCase(getFeedbackByTeacher.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Delete Feedback
      .addCase(deleteFeedback.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteFeedback.fulfilled, (state, action) => {
        state.loading = false;
        state.feedbackList = state.feedbackList.filter(
          (feedback) => feedback._id !== action.payload.id
        );
      })
      .addCase(deleteFeedback.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default feedbackSlice.reducer;
