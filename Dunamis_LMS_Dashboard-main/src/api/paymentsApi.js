import axios from "./axios";

// Pure data-access for the Finance Desk. Caching/loading/error are owned by
// TanStack Query (see hooks/usePayments.js). The bearer token is attached by
// the axios request interceptor.

const toError = (err, fallback) => {
  const data = err.response?.data;
  const msg = typeof data === "string" ? data : data?.message || err.message || fallback;
  const e = new Error(msg || fallback);
  e.response = err.response;
  return e;
};

// Drops null/undefined/"" so the validator never sees an empty filter value.
const clean = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );

export async function fetchPayments(params = {}) {
  try {
    const { data } = await axios.get("/payments", { params: clean(params) });
    return data;
  } catch (err) {
    throw toError(err, "Failed to load payments");
  }
}

export async function fetchNeedsAttention({ page = 1, limit = 50, includeAbandoned = false } = {}) {
  try {
    const { data } = await axios.get("/payments/needs-attention", {
      params: { page, limit, includeAbandoned },
    });
    return data;
  } catch (err) {
    throw toError(err, "Failed to load payments needing attention");
  }
}

export async function fetchDues(params = {}) {
  try {
    const { data } = await axios.get("/payments/dues", { params: clean(params) });
    return data;
  } catch (err) {
    throw toError(err, "Failed to load outstanding dues");
  }
}

export async function fetchNeedsAttentionCount() {
  try {
    const { data } = await axios.get("/payments/needs-attention/count");
    return data;
  } catch (err) {
    throw toError(err, "Failed to load the payments alert count");
  }
}

export async function reverifyPayment(id) {
  try {
    const { data } = await axios.post(`/payments/${id}/reverify`);
    return data;
  } catch (err) {
    throw toError(err, "Re-verification failed");
  }
}

export async function fetchPaymentDetail(id) {
  try {
    const { data } = await axios.get(`/payments/${id}`);
    return data;
  } catch (err) {
    throw toError(err, "Failed to load the payment");
  }
}

export async function recordCashInstallment(payload) {
  try {
    const { data } = await axios.post("/payments/cash-installment", clean(payload));
    return data;
  } catch (err) {
    throw toError(err, "Failed to record the cash payment");
  }
}
