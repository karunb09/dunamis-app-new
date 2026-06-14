import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosAuth from "../../utils/axiosAuth";

const BASE_URL = import.meta.env.VITE_BASE_URL;
// Abhi iska use nhi kar rhe hai, backend se poulated data use kiya hai.
// Create Remuneration
export const createRemuneration = createAsyncThunk(
  "remuneration/createRemuneration",
  async (remunerationData, thunkAPI) => {
    try {
      const response = await axiosAuth.post(
        `${BASE_URL}/remuneration`,
        remunerationData
      );
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

// Get Remuneration by Payslip ID
export const getRemunerationById = createAsyncThunk(
  "remuneration/getRemunerationById",
  async (id, thunkAPI) => {
    try {
      const response = await axiosAuth.get(
        `${BASE_URL}/remuneration/payslip/${id}`
      );
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

// Get Remuneration by Teacher ID
export const getRemunerationByTeacher = createAsyncThunk(
  "remuneration/getRemunerationByTeacher",
  async (teacherId, thunkAPI) => {
    try {
      const response = await axiosAuth.get(`${BASE_URL}/remuneration/${teacherId}`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

// Update Remuneration
export const updateRemuneration = createAsyncThunk(
  "remuneration/updateRemuneration",
  async ({ id, remunerationData }, thunkAPI) => {
    try {
      const response = await axiosAuth.put(
        `${BASE_URL}/remuneration/${id}`,
        remunerationData
      );
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

// Delete Remuneration
export const deleteRemuneration = createAsyncThunk(
  "remuneration/deleteRemuneration",
  async (id, thunkAPI) => {
    try {
      const response = await axiosAuth.delete(`${BASE_URL}/remuneration/${id}`);
      return { id };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

// Slice
const remunerationSlice = createSlice({
  name: "remuneration",
  initialState: {
    remunerations: [],
    currentRemuneration: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Create
      .addCase(createRemuneration.pending, (state) => {
        state.loading = true;
      })
      .addCase(createRemuneration.fulfilled, (state, action) => {
        state.loading = false;
        state.remunerations.push(action.payload);
      })
      .addCase(createRemuneration.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Get by Payslip ID
      .addCase(getRemunerationById.pending, (state) => {
        state.loading = true;
      })
      .addCase(getRemunerationById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentRemuneration = action.payload;
      })
      .addCase(getRemunerationById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Get by Teacher ID
      .addCase(getRemunerationByTeacher.pending, (state) => {
        state.loading = true;
      })
      .addCase(getRemunerationByTeacher.fulfilled, (state, action) => {
        state.loading = false;
        state.remunerations = action.payload;
      })
      .addCase(getRemunerationByTeacher.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update
      .addCase(updateRemuneration.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateRemuneration.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload;
        state.remunerations = state.remunerations.map((r) =>
          r.id === updated.id ? updated : r
        );
      })
      .addCase(updateRemuneration.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Delete
      .addCase(deleteRemuneration.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteRemuneration.fulfilled, (state, action) => {
        state.loading = false;
        state.remunerations = state.remunerations.filter(
          (r) => r.id !== action.payload.id
        );
      })
      .addCase(deleteRemuneration.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default remunerationSlice.reducer;
