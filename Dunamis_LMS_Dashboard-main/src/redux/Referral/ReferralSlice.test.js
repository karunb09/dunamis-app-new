import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import reducer, {
  fetchReferrals,
  fetchPartners,
  invalidatePartners,
} from "./ReferralSlice";
import axiosAuth from "../../utils/axiosAuth";

vi.mock("../../utils/axiosAuth", () => ({
  default: { get: vi.fn() },
}));

// Regression: this slice holds two independent lists. A single shared status
// field would let fetchReferrals cancel fetchPartners, leaving the Freelancers
// tab permanently empty.

const makeStore = () => configureStore({ reducer: { referral: reducer } });

describe("ReferralSlice — two lists, two guards", () => {
  beforeEach(() => {
    localStorage.setItem("token", "t");
    axiosAuth.get.mockImplementation(async (url) =>
      String(url).includes("partner")
        ? { data: { success: true, partners: [{ _id: "p1" }] } }
        : { data: { success: true, referrals: [{ _id: "r1" }] } }
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("loads BOTH lists when dispatched together on one mount", async () => {
    const store = makeStore();
    await Promise.all([
      store.dispatch(fetchReferrals()),
      store.dispatch(fetchPartners()),
    ]);

    const s = store.getState().referral;
    expect(s.referrals).toHaveLength(1);
    expect(s.partners).toHaveLength(1);
    expect(axiosAuth.get).toHaveBeenCalledTimes(2);
  });

  it("guards the two lists independently", async () => {
    const store = makeStore();
    await store.dispatch(fetchReferrals());
    await store.dispatch(fetchPartners());
    expect(axiosAuth.get).toHaveBeenCalledTimes(2);

    // both cached now: neither refetches
    await store.dispatch(fetchReferrals());
    await store.dispatch(fetchPartners());
    expect(axiosAuth.get).toHaveBeenCalledTimes(2);

    // invalidating partners must not disturb referrals
    store.dispatch(invalidatePartners());
    await store.dispatch(fetchReferrals());
    await store.dispatch(fetchPartners());
    expect(axiosAuth.get).toHaveBeenCalledTimes(3);
    expect(store.getState().referral.referralsStatus).toBe("succeeded");
  });
});
