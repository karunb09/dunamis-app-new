import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { getStoredToken } from "../../utils/authSession";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const getAuthConfig = () => {
  const token = getStoredToken();
  return {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    withCredentials: true,
  };
};

export const fetchSiteContent = createAsyncThunk(
  "siteContent/fetchAll",
  async (type = "", { rejectWithValue }) => {
    try {
      const response = await axios.get(`${BASE_URL}/siteContent`, {
        ...getAuthConfig(),
        params: type ? { type } : {},
      });
      return response.data?.data || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const createSiteContent = createAsyncThunk(
  "siteContent/create",
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/siteContent`,
        payload,
        getAuthConfig()
      );
      dispatch(fetchSiteContent(payload.type || ""));
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const updateSiteContent = createAsyncThunk(
  "siteContent/update",
  async ({ id, payload }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axios.put(
        `${BASE_URL}/siteContent/${id}`,
        payload,
        getAuthConfig()
      );
      dispatch(fetchSiteContent(payload.type || ""));
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const deleteSiteContent = createAsyncThunk(
  "siteContent/delete",
  async ({ id, type }, { dispatch, rejectWithValue }) => {
    try {
      await axios.delete(`${BASE_URL}/siteContent/${id}`, getAuthConfig());
      dispatch(fetchSiteContent(type || ""));
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const siteContentSlice = createSlice({
  name: "siteContent",
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSiteContent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSiteContent.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchSiteContent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      .addMatcher(
        (action) =>
          [
            createSiteContent.pending.type,
            updateSiteContent.pending.type,
            deleteSiteContent.pending.type,
          ].includes(action.type),
        (state) => {
          state.loading = true;
          state.error = null;
        }
      )
      .addMatcher(
        (action) =>
          [
            createSiteContent.fulfilled.type,
            updateSiteContent.fulfilled.type,
            deleteSiteContent.fulfilled.type,
          ].includes(action.type),
        (state) => {
          state.loading = false;
        }
      )
      .addMatcher(
        (action) =>
          [
            createSiteContent.rejected.type,
            updateSiteContent.rejected.type,
            deleteSiteContent.rejected.type,
          ].includes(action.type),
        (state, action) => {
          state.loading = false;
          state.error = action.payload || action.error.message;
        }
      );
  },
});

export default siteContentSlice.reducer;
