import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getStoredToken } from "../../utils/authSession";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const jsonHeaders = () => {
  const token = getStoredToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const authHeaders = () => {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const submitCourseRequest = createAsyncThunk(
  "courseRequests/submit",
  async (formData, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE_URL}/course-requests`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to submit request");
      return data.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchMyRequests = createAsyncThunk(
  "courseRequests/fetchMy",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE_URL}/course-requests/my`, {
        headers: jsonHeaders(),
        credentials: "include",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to fetch requests");
      return data.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchAllRequests = createAsyncThunk(
  "courseRequests/fetchAll",
  async (status = "", { rejectWithValue }) => {
    try {
      const qs = status ? `?status=${status}` : "";
      const res = await fetch(`${BASE_URL}/course-requests${qs}`, {
        headers: jsonHeaders(),
        credentials: "include",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to fetch requests");
      return data.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateCourseRequestStatus = createAsyncThunk(
  "courseRequests/updateStatus",
  async ({ id, status, adminNotes = "" }, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE_URL}/course-requests/${id}/status`, {
        method: "PUT",
        headers: jsonHeaders(),
        credentials: "include",
        body: JSON.stringify({ status, adminNotes }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to update status");
      return { id, status, adminNotes };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateCourseItemStatus = createAsyncThunk(
  "courseRequests/updateItem",
  async ({ id, itemIndex, status, adminNotes = "", courseId }, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE_URL}/course-requests/${id}/items/${itemIndex}`, {
        method: "PATCH",
        headers: jsonHeaders(),
        credentials: "include",
        body: JSON.stringify({ status, adminNotes, courseId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to update item");
      return data.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const courseRequestSlice = createSlice({
  name: "courseRequests",
  initialState: {
    myRequests: [],
    allRequests: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(submitCourseRequest.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(submitCourseRequest.fulfilled, (state, action) => {
        state.loading = false;
        state.myRequests.unshift(action.payload);
      })
      .addCase(submitCourseRequest.rejected, (state, action) => { state.loading = false; state.error = action.payload; })

      .addCase(fetchMyRequests.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchMyRequests.fulfilled, (state, action) => { state.loading = false; state.myRequests = action.payload; })
      .addCase(fetchMyRequests.rejected, (state, action) => { state.loading = false; state.error = action.payload; })

      .addCase(fetchAllRequests.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAllRequests.fulfilled, (state, action) => { state.loading = false; state.allRequests = action.payload; })
      .addCase(fetchAllRequests.rejected, (state, action) => { state.loading = false; state.error = action.payload; })

      .addCase(updateCourseRequestStatus.fulfilled, (state, action) => {
        const { id, status, adminNotes } = action.payload;
        state.allRequests = state.allRequests.map((r) =>
          r._id === id ? { ...r, status, adminNotes } : r
        );
      })

      .addCase(updateCourseItemStatus.fulfilled, (state, action) => {
        const updated = action.payload;
        state.allRequests = state.allRequests.map((r) =>
          r._id === updated._id ? updated : r
        );
        state.myRequests = state.myRequests.map((r) =>
          r._id === updated._id ? updated : r
        );
      });
  },
});

export default courseRequestSlice.reducer;
