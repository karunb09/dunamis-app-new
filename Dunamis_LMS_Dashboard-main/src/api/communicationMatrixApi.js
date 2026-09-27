import axios from "./axios";

// Pure data-access for the communication matrix. Caching/loading/error are
// owned by TanStack Query (hooks/useCommunicationMatrix.js).

const toError = (err, fallback) => {
  const data = err.response?.data;
  const msg = typeof data === "string" ? data : data?.message || err.message || fallback;
  const e = new Error([msg || fallback, data?.hint].filter(Boolean).join(" "));
  e.response = err.response;
  return e;
};

export async function fetchMatrix() {
  try {
    const { data } = await axios.get("/communication-matrix");
    return data.rows || [];
  } catch (err) {
    throw toError(err, "Failed to load the communication matrix");
  }
}

export async function saveMatrixRule({ event, rule }) {
  try {
    const { data } = await axios.put(`/communication-matrix/${event}`, rule);
    return data.row;
  } catch (err) {
    throw toError(err, "Failed to save");
  }
}

export async function resetMatrixRule(event) {
  try {
    const { data } = await axios.delete(`/communication-matrix/${event}`);
    return data.row;
  } catch (err) {
    throw toError(err, "Failed to reset");
  }
}
