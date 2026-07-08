import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosAuth from "../../utils/axiosAuth";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export const fetchReferrals = createAsyncThunk(
  "referral/fetchReferrals",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosAuth.get(`${BASE_URL}/referral`);
      if (!data.success) return rejectWithValue(data.message);
      return data.referrals;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const updateReferralReward = createAsyncThunk(
  "referral/updateReward",
  async ({ id, rewardStatus, rewardNote }, { rejectWithValue }) => {
    try {
      const { data } = await axiosAuth.patch(`${BASE_URL}/referral/${id}/reward`, {
        rewardStatus,
        rewardNote,
      });
      if (!data.success) return rejectWithValue(data.message);
      return data.referral;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchPartners = createAsyncThunk(
  "referral/fetchPartners",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosAuth.get(`${BASE_URL}/referral/partners`);
      if (!data.success) return rejectWithValue(data.message);
      return data.partners;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const createPartner = createAsyncThunk(
  "referral/createPartner",
  async (partnerData, { rejectWithValue }) => {
    try {
      const { data } = await axiosAuth.post(`${BASE_URL}/referral/partners`, partnerData);
      if (!data.success) return rejectWithValue(data.message);
      return data.partner;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const updatePartner = createAsyncThunk(
  "referral/updatePartner",
  async ({ id, partnerData }, { rejectWithValue }) => {
    try {
      const { data } = await axiosAuth.put(`${BASE_URL}/referral/partners/${id}`, partnerData);
      if (!data.success) return rejectWithValue(data.message);
      return data.partner;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const referralSlice = createSlice({
  name: "referral",
  initialState: {
    referrals: [],
    partners: [],
    loading: false,
    partnersLoading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReferrals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReferrals.fulfilled, (state, action) => {
        state.loading = false;
        state.referrals = action.payload;
      })
      .addCase(fetchReferrals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateReferralReward.fulfilled, (state, action) => {
        state.referrals = state.referrals.map((referral) =>
          referral._id === action.payload._id
            ? {
                ...referral,
                rewardStatus: action.payload.rewardStatus,
                rewardNote: action.payload.rewardNote,
                rewardedAt: action.payload.rewardedAt,
              }
            : referral
        );
      })
      .addCase(fetchPartners.pending, (state) => {
        state.partnersLoading = true;
      })
      .addCase(fetchPartners.fulfilled, (state, action) => {
        state.partnersLoading = false;
        state.partners = action.payload;
      })
      .addCase(fetchPartners.rejected, (state, action) => {
        state.partnersLoading = false;
        state.error = action.payload;
      })
      .addCase(createPartner.fulfilled, (state, action) => {
        state.partners = [action.payload, ...state.partners];
      })
      .addCase(updatePartner.fulfilled, (state, action) => {
        state.partners = state.partners.map((partner) =>
          partner._id === action.payload._id ? action.payload : partner
        );
      });
  },
});

export default referralSlice.reducer;
