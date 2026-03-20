import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

const getAuthHeaders = () => {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const createEnrollmentOrder = createAsyncThunk(
  "enrollment/createOrder",
  async (orderData, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/v1/enrollment/create-order`,
        orderData,
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create order"
      );
    }
  }
);

export const verifyEnrollmentPayment = createAsyncThunk(
  "enrollment/verifyPayment",
  async (paymentData, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/v1/enrollment/verify-payment`,
        paymentData,
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Payment verification failed"
      );
    }
  }
);

export const fetchEnrolledCourses = createAsyncThunk(
  "enrollment/fetchEnrolled",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${BASE_URL}/v1/enrollment/enrolled-courses`,
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch enrolled courses"
      );
    }
  }
);

export const generateInstallments = createAsyncThunk(
  "enrollment/generateInstallments",
  async (installmentData, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/v1/enrollment/generate-installments`,
        installmentData,
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to generate installments"
      );
    }
  }
);

const enrollmentSlice = createSlice({
  name: "enrollment",
  initialState: {
    order: null,
    enrolledCourses: [],
    installments: [],
    loading: false,
    error: null,
    verificationStatus: null,
  },
  reducers: {
    clearOrder: (state) => {
      state.order = null;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearVerificationStatus: (state) => {
      state.verificationStatus = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createEnrollmentOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createEnrollmentOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.order = action.payload.data || action.payload;
      })
      .addCase(createEnrollmentOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(verifyEnrollmentPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyEnrollmentPayment.fulfilled, (state, action) => {
        state.loading = false;
        state.verificationStatus = "success";
      })
      .addCase(verifyEnrollmentPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.verificationStatus = "failed";
      })
      .addCase(fetchEnrolledCourses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEnrolledCourses.fulfilled, (state, action) => {
        state.loading = false;
        state.enrolledCourses = action.payload.data || [];
      })
      .addCase(fetchEnrolledCourses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(generateInstallments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateInstallments.fulfilled, (state, action) => {
        state.loading = false;
        state.installments = action.payload.data || [];
      })
      .addCase(generateInstallments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearOrder, clearError, clearVerificationStatus } =
  enrollmentSlice.actions;
export default enrollmentSlice.reducer;
