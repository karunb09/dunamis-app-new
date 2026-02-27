import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_URL;

// Async Thunks for making API requests

// Create City
export const createCity = createAsyncThunk(
  "city/createCity",
  async (cityData, thunkAPI) => {
    try {
      const response = await axios.post(`${BASE_URL}/city/create`, cityData);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

// Get all cities
export const getAllCities = createAsyncThunk(
  "city/getAllCities",
  async (_, thunkAPI) => {
    try {
      const response = await axios.get(`${BASE_URL}/city/get-all-cities`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

// Get City Managers
export const getCityManagers = createAsyncThunk(
  "city/getCityManagers",
  async (_, thunkAPI) => {
    try {
      const response = await axios.get(`${BASE_URL}/city/managers`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

// Get City by ID
export const getCityById = createAsyncThunk(
  "city/getCityById",
  async (cityId, thunkAPI) => {
    try {
      const response = await axios.get(`${BASE_URL}/city/${cityId}`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

// Update City
export const updateCity = createAsyncThunk(
  "city/updateCity",
  async ({ cityId, cityData }, thunkAPI) => {
    try {
      const response = await axios.put(`${BASE_URL}/city/${cityId}`, cityData);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

// Delete City
export const deleteCity = createAsyncThunk(
  "city/deleteCity",
  async (cityId, thunkAPI) => {
    try {
      const response = await axios.delete(`${BASE_URL}/city/${cityId}`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

// City Slice
const citySlice = createSlice({
  name: "city",
  initialState: {
    cities: [],
    city: null,
    managers: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Create City
      .addCase(createCity.pending, (state) => {
        state.loading = true;
      })
      .addCase(createCity.fulfilled, (state, action) => {
        state.loading = false;
        state.cities.push(action.payload);
      })
      .addCase(createCity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Get All Cities
      .addCase(getAllCities.pending, (state) => {
        state.loading = true;
      })
      .addCase(getAllCities.fulfilled, (state, action) => {
        state.loading = false;
        state.cities = action.payload.cities;
      })
      .addCase(getAllCities.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Get City Managers
      .addCase(getCityManagers.pending, (state) => {
        state.loading = true;
      })
      .addCase(getCityManagers.fulfilled, (state, action) => {
        state.loading = false;
        state.managers = action.payload;
      })
      .addCase(getCityManagers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Get City by ID
      .addCase(getCityById.pending, (state) => {
        state.loading = true;
      })
      .addCase(getCityById.fulfilled, (state, action) => {
        state.loading = false;
        state.city = action.payload;
      })
      .addCase(getCityById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update City
      .addCase(updateCity.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateCity.fulfilled, (state, action) => {
        state.loading = false;
        const updatedCity = action.payload;
        state.cities = state.cities.map((city) =>
          city.id === updatedCity.id ? updatedCity : city
        );
      })
      .addCase(updateCity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Delete City
      .addCase(deleteCity.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteCity.fulfilled, (state, action) => {
        state.loading = false;
        state.cities = state.cities.filter(
          (city) => city.id !== action.payload.id
        );
      })
      .addCase(deleteCity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default citySlice.reducer;
