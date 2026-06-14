import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { getStoredToken } from "../../utils/authSession";

const BASE_URL = import.meta.env.VITE_BASE_URL;

// Admin-only mutations on the backend; send the bearer token.
const authHeader = () => {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Async Thunks for making API requests

// Create Zone
export const createZone = createAsyncThunk(
  "zone/createZone",
  async (zoneData, thunkAPI) => {
    try {
      const response = await axios.post(`${BASE_URL}/zone/create`, zoneData, { headers: authHeader() });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

// Get All Zones
export const getAllZones = createAsyncThunk(
  "zone/getAllZones",
  async (_, thunkAPI) => {
    try {
      const response = await axios.get(`${BASE_URL}/zone/get-all`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

// Get Zone by ID
export const getZoneById = createAsyncThunk(
  "zone/getZoneById",
  async (zoneId, thunkAPI) => {
    try {
      const response = await axios.get(`${BASE_URL}/zone/${zoneId}`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

// Update Zone
export const updateZone = createAsyncThunk(
  "zone/updateZone",
  async ({ zoneId, zoneData }, thunkAPI) => {
    try {
      const response = await axios.put(
        `${BASE_URL}/zone/updatezone/${zoneId}`,
        zoneData,
        { headers: authHeader() }
      );
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

// Delete Zone
export const deleteZone = createAsyncThunk(
  "zone/deleteZone",
  async (zoneId, thunkAPI) => {
    try {
      const response = await axios.delete(`${BASE_URL}/zone/delete/${zoneId}`, { headers: authHeader() });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

// Zone Slice
const zoneSlice = createSlice({
  name: "zone",
  initialState: {
    zones: [],
    zone: null,
    loading: false,
    listStatus: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Create Zone
      .addCase(createZone.pending, (state) => {
        state.loading = true;
      })
      .addCase(createZone.fulfilled, (state, action) => {
        state.loading = false;
        state.zones.push(action.payload);
      })
      .addCase(createZone.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Get All Zones
      .addCase(getAllZones.pending, (state) => {
        state.loading = true;
        state.listStatus = "loading";
      })
      .addCase(getAllZones.fulfilled, (state, action) => {
        state.loading = false;
        state.listStatus = "succeeded";
        state.zones = action.payload.zone;
      })
      .addCase(getAllZones.rejected, (state, action) => {
        state.loading = false;
        state.listStatus = "failed";
        state.error = action.payload;
      })

      // Get Zone by ID
      .addCase(getZoneById.pending, (state) => {
        state.loading = true;
      })
      .addCase(getZoneById.fulfilled, (state, action) => {
        state.loading = false;
        state.zone = action.payload;
      })
      .addCase(getZoneById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update Zone
      .addCase(updateZone.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateZone.fulfilled, (state, action) => {
        state.loading = false;
        const updatedZone = action.payload;
        state.zones = state.zones.map((zone) =>
          zone.id === updatedZone.id ? updatedZone : zone
        );
      })
      .addCase(updateZone.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Delete Zone
      .addCase(deleteZone.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteZone.fulfilled, (state, action) => {
        state.loading = false;
        state.zones = state.zones.filter(
          (zone) => zone.id !== action.payload.id
        );
      })
      .addCase(deleteZone.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default zoneSlice.reducer;
