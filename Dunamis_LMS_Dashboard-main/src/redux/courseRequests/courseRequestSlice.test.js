import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import reducer, {
  fetchAllRequests,
  invalidateAllRequests,
} from "./courseRequestSlice";

// The cache guard is the load-bearing assumption for every guarded slice:
// a second mount must issue no request, while invalidation must let one through.

const makeStore = () =>
  configureStore({ reducer: { courseRequests: reducer } });

const okResponse = (data) => ({
  ok: true,
  json: async () => ({ success: true, data }),
});

describe("fetchAllRequests cache guard", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(async () => okResponse([{ _id: "r1", status: "pending" }]));
    localStorage.setItem("token", "t");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("fetches on first dispatch and populates the list", async () => {
    const store = makeStore();
    await store.dispatch(fetchAllRequests());

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const s = store.getState().courseRequests;
    expect(s.allRequests).toHaveLength(1);
    expect(s.allRequestsStatus).toBe("succeeded");
    expect(s.allRequestsLoading).toBe(false);
  });

  it("does NOT refetch on subsequent dispatches — the tab-switch case", async () => {
    const store = makeStore();
    await store.dispatch(fetchAllRequests());
    await store.dispatch(fetchAllRequests());
    await store.dispatch(fetchAllRequests());

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    // cached rows survive the cancelled dispatches
    expect(store.getState().courseRequests.allRequests).toHaveLength(1);
  });

  it("a cancelled dispatch does not flip status to failed or set an error", async () => {
    const store = makeStore();
    await store.dispatch(fetchAllRequests());
    await store.dispatch(fetchAllRequests());

    const s = store.getState().courseRequests;
    expect(s.allRequestsStatus).toBe("succeeded");
    expect(s.error).toBeNull();
  });

  it("refetches after invalidateAllRequests — the Refresh button path", async () => {
    const store = makeStore();
    await store.dispatch(fetchAllRequests());
    store.dispatch(invalidateAllRequests());
    await store.dispatch(fetchAllRequests());

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(store.getState().courseRequests.allRequestsStatus).toBe("succeeded");
  });

  it("retries after a failure instead of being stranded", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      json: async () => ({ success: false, message: "boom" }),
    }));
    const store = makeStore();
    await store.dispatch(fetchAllRequests());
    expect(store.getState().courseRequests.allRequestsStatus).toBe("failed");

    globalThis.fetch = vi.fn(async () => okResponse([{ _id: "r1" }]));
    await store.dispatch(fetchAllRequests());
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(store.getState().courseRequests.allRequestsStatus).toBe("succeeded");
  });

  it("sends no status query param — filtering is client-side", async () => {
    const store = makeStore();
    await store.dispatch(fetchAllRequests("pending"));

    const url = globalThis.fetch.mock.calls[0][0];
    expect(url).not.toContain("?status=");
    expect(url).toContain("/course-requests");
  });
});
