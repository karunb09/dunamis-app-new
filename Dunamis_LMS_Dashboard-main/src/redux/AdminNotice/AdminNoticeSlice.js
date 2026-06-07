import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_URL;

// Async Thunks for Notice API

export const createNotice = createAsyncThunk(
  "notice/createNotice",
  async (formData, thunkAPI) => {
    try {
      const token = localStorage.getItem("token"); // or get from state

      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`, // send token here
        },
      };

      const response = await axios.post(
        `${BASE_URL}/adminNotice/`,
        formData,
        config
      );
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to create notice"
      );
    }
  }
);

// Get All Notices
export const getAllNotices = createAsyncThunk(
  "notice/getAllNotices",
  async (_, thunkAPI) => {
    try {
      const response = await axios.get(`${BASE_URL}/adminNotice/`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

// Get Notice by ID
export const getNoticeById = createAsyncThunk(
  "notice/getNoticeById",
  async (noticeId, thunkAPI) => {
    try {
      const response = await axios.get(`${BASE_URL}/adminNotice/${noticeId}`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

// Update Notice
export const updateNotice = createAsyncThunk(
  "notice/updateNotice",
  async ({ noticeId, noticeData }, thunkAPI) => {
    try {
      const response = await axios.put(
        `${BASE_URL}/adminNotice/${noticeId}`,
        noticeData
      );
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

// Delete Notice
export const deleteNotice = createAsyncThunk(
  "notice/deleteNotice",
  async (noticeId, thunkAPI) => {
    try {
      const response = await axios.delete(
        `${BASE_URL}/adminNotice/${noticeId}`
      );
      return { id: noticeId };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

// Send Notice
export const sendNotice = createAsyncThunk(
  "notice/sendNotice",
  async (noticeId, thunkAPI) => {
    try {
      const response = await axios.patch(
        `${BASE_URL}/adminNotice/send/${noticeId}`
      );
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

// Slice
const noticeSlice = createSlice({
  name: "notice",
  initialState: {
    notices: [],
    notice: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Create
      .addCase(createNotice.pending, (state) => {
        state.loading = true;
      })
      .addCase(createNotice.fulfilled, (state, action) => {
        state.loading = false;
        state.notices.push(action.payload);
      })
      .addCase(createNotice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Get All
      .addCase(getAllNotices.pending, (state) => {
        state.loading = true;
      })
      .addCase(getAllNotices.fulfilled, (state, action) => {
        state.loading = false;
        state.notices = action.payload.notices || action.payload; // Handle both { notices: [] } and []
      })
      .addCase(getAllNotices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Get By ID
      .addCase(getNoticeById.pending, (state) => {
        state.loading = true;
      })
      .addCase(getNoticeById.fulfilled, (state, action) => {
        state.loading = false;
        state.notice = action.payload;
      })
      .addCase(getNoticeById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update
      .addCase(updateNotice.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateNotice.fulfilled, (state, action) => {
        state.loading = false;
        const updatedNotice = action.payload;
        state.notices = state.notices.map((n) =>
          n.id === updatedNotice.id ? updatedNotice : n
        );
      })
      .addCase(updateNotice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Delete
      .addCase(deleteNotice.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteNotice.fulfilled, (state, action) => {
        state.loading = false;
        state.notices = state.notices.filter((n) => n.id !== action.payload.id);
      })
      .addCase(deleteNotice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Send
      .addCase(sendNotice.pending, (state) => {
        state.loading = true;
      })
      .addCase(sendNotice.fulfilled, (state, action) => {
        state.loading = false;
        // Optionally update status to 'sent' or similar
        const sentNotice = action.payload;
        state.notices = state.notices.map((n) =>
          n.id === sentNotice.id ? sentNotice : n
        );
      })
      .addCase(sendNotice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default noticeSlice.reducer;
