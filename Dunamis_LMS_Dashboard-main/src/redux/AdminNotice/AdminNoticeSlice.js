import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosAuth from "../../utils/axiosAuth";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export const createNotice = createAsyncThunk(
  "notice/createNotice",
  async (formData, thunkAPI) => {
    try {
      const response = await axiosAuth.post(
        `${BASE_URL}/adminNotice/`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to create notice"
      );
    }
  }
);

export const getAllNotices = createAsyncThunk(
  "notice/getAllNotices",
  async (_, thunkAPI) => {
    try {
      const response = await axiosAuth.get(`${BASE_URL}/adminNotice/`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data);
    }
  },
  {
    condition: (_arg, { getState }) => {
      const { listStatus } = getState().notice;
      return listStatus === "idle" || listStatus === "failed";
    },
  }
);

export const getNoticeById = createAsyncThunk(
  "notice/getNoticeById",
  async (noticeId, thunkAPI) => {
    try {
      const response = await axiosAuth.get(`${BASE_URL}/adminNotice/${noticeId}`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data);
    }
  }
);

export const updateNotice = createAsyncThunk(
  "notice/updateNotice",
  async ({ noticeId, noticeData }, thunkAPI) => {
    try {
      const response = await axiosAuth.put(
        `${BASE_URL}/adminNotice/${noticeId}`,
        noticeData
      );
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data);
    }
  }
);

export const deleteNotice = createAsyncThunk(
  "notice/deleteNotice",
  async (noticeId, thunkAPI) => {
    try {
      await axiosAuth.delete(`${BASE_URL}/adminNotice/${noticeId}`);
      return { id: noticeId };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data);
    }
  }
);

export const sendNotice = createAsyncThunk(
  "notice/sendNotice",
  async (noticeId, thunkAPI) => {
    try {
      const response = await axiosAuth.patch(
        `${BASE_URL}/adminNotice/send/${noticeId}`
      );
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data);
    }
  }
);

const noticeSlice = createSlice({
  name: "notice",
  initialState: {
    listLoading: false,
    listStatus: "idle",
    notices: [],
    notice: null,
    loading: false,
    error: null,
  },
  reducers: {
    invalidateNotices: (state) => {
      state.listStatus = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
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

      .addCase(getAllNotices.pending, (state) => {
        state.listLoading = true;
        state.listStatus = "loading";
      })
      .addCase(getAllNotices.fulfilled, (state, action) => {
        state.listLoading = false;
        state.listStatus = "succeeded";
        state.notices = action.payload.notices || action.payload;
      })
      .addCase(getAllNotices.rejected, (state, action) => {
        state.listLoading = false;
        state.listStatus = "failed";
        state.error = action.payload;
      })

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

      .addCase(sendNotice.pending, (state) => {
        state.loading = true;
      })
      .addCase(sendNotice.fulfilled, (state, action) => {
        state.loading = false;
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

export const { invalidateNotices } = noticeSlice.actions;
export default noticeSlice.reducer;
