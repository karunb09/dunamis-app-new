import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

export const fetchMentors = createAsyncThunk(
  "mentors/fetchMentors",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${BASE_URL}/v1/teachers/public`);
      const payload = response.data?.data ?? response.data;
      return Array.isArray(payload) ? payload : [];
    } catch (error) {
      if (error.response?.status === 404) {
        return [];
      }
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch mentors"
      );
    }
  },
  {
    condition: (_, { getState }) => {
      const { mentor } = getState();
      return !mentor.loading && mentor.mentors.length === 0;
    },
  }
);

const mentorSlice = createSlice({
  name: "mentors",
  initialState: {
    mentors: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMentors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMentors.fulfilled, (state, action) => {
        state.loading = false;
        state.mentors = action.payload || [];
      })
      .addCase(fetchMentors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default mentorSlice.reducer;
