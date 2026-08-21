import axios from "./axios";

// Pure data-access for the Daily Attendance report. Caching/loading/error are
// owned by TanStack Query (see hooks/useAttendanceReport.js).

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

export async function fetchDailyAttendance(params = {}) {
  try {
    const { data } = await axios.get("/reports/attendance/daily", { params: clean(params) });
    return data;
  } catch (err) {
    throw toError(err, "Failed to load the attendance report");
  }
}
