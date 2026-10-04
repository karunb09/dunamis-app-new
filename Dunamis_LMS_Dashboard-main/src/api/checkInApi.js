import axios from "./axios";

// Pure data-access for branch check-ins. Caching/loading/error are owned by
// TanStack Query (see hooks/useCheckIns.js).

// Carries the server's `details` (distance, radius) and `hint` through, so the
// page can say how far away the instructor is rather than just "refused".
export const toError = (err, fallback) => {
  const data = err.response?.data;
  const msg = typeof data === "string" ? data : data?.message || err.message || fallback;
  const e = new Error(msg || fallback);
  e.response = err.response;
  e.details = data?.details || null;
  e.hint = data?.hint || "";
  return e;
};

// Drops null/undefined/"" so the validator never sees an empty filter value.
export const clean = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );

export async function fetchMyCheckInToday() {
  try {
    const { data } = await axios.get("/check-ins/me/today");
    return data;
  } catch (err) {
    throw toError(err, "Failed to load today's check-ins");
  }
}

export async function fetchMyCheckInHistory(month) {
  try {
    const { data } = await axios.get("/check-ins/me", { params: clean({ month }) });
    return data;
  } catch (err) {
    throw toError(err, "Failed to load your check-in history");
  }
}

export async function submitCheckIn(body) {
  try {
    const { data } = await axios.post("/check-ins", body);
    return data;
  } catch (err) {
    throw toError(err, "Check-in failed");
  }
}

export async function submitCheckOut(id, body) {
  try {
    const { data } = await axios.post(`/check-ins/${id}/check-out`, body);
    return data;
  } catch (err) {
    throw toError(err, "Check-out failed");
  }
}

export async function fetchCheckInReport(params = {}) {
  try {
    const { data } = await axios.get("/check-ins", { params: clean(params) });
    return data;
  } catch (err) {
    throw toError(err, "Failed to load the check-in report");
  }
}

export async function addCheckInNote(id, body) {
  try {
    const { data } = await axios.post(`/check-ins/${id}/notes`, body);
    return data;
  } catch (err) {
    throw toError(err, "Failed to save the note");
  }
}
