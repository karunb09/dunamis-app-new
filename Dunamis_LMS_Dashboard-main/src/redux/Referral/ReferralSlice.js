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
  },
  {
    condition: (_arg, { getState }) => {
      const { referralsStatus } = getState().referral;
      return referralsStatus === "idle" || referralsStatus === "failed";
    },
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
  },
  {
    condition: (_arg, { getState }) => {
      const { partnersStatus } = getState().referral;
      return partnersStatus === "idle" || partnersStatus === "failed";
    },
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

export const deletePartner = createAsyncThunk(
  "referral/deletePartner",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await axiosAuth.delete(`${BASE_URL}/referral/partners/${id}`);
      if (!data.success) return rejectWithValue(data.message);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const referralSlice = createSlice({
  name: "referral",
  initialState: {
    referralsStatus: "idle",
    partnersStatus: "idle",
    referrals: [],
    partners: [],
    loading: false,
    partnersLoading: false,
    error: null,
  },
  reducers: {
    invalidateReferrals: (state) => {
      state.referralsStatus = "idle";
    },
    invalidatePartners: (state) => {
      state.partnersStatus = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReferrals.pending, (state) => {
        state.loading = true;
        state.referralsStatus = "loading";
        state.error = null;
      })
      .addCase(fetchReferrals.fulfilled, (state, action) => {
        state.loading = false;
        state.referralsStatus = "succeeded";
        state.referrals = action.payload;
      })
      .addCase(fetchReferrals.rejected, (state, action) => {
        state.loading = false;
        state.referralsStatus = "failed";
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
        state.partnersStatus = "loading";
      })
      .addCase(fetchPartners.fulfilled, (state, action) => {
        state.partnersLoading = false;
        state.partnersStatus = "succeeded";
        state.partners = action.payload;
      })
      .addCase(fetchPartners.rejected, (state, action) => {
        state.partnersLoading = false;
        state.partnersStatus = "failed";
        state.error = action.payload;
      })
      .addCase(createPartner.fulfilled, (state, action) => {
        state.partners = [action.payload, ...state.partners];
      })
      .addCase(updatePartner.fulfilled, (state, action) => {
        state.partners = state.partners.map((partner) =>
          partner._id === action.payload._id ? action.payload : partner
        );
      })
      .addCase(deletePartner.fulfilled, (state, action) => {
        state.partners = state.partners.filter((partner) => partner._id !== action.payload);
      });
  },
});

export const { invalidateReferrals, invalidatePartners } = referralSlice.actions;
export default referralSlice.reducer;
