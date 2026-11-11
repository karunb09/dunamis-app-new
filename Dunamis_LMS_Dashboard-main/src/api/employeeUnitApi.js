import axios from "./axios";

// Pure data-access for employee units (DSM, DSD, DCC, DLH, …). Caching is owned
// by TanStack Query (hooks/useEmployeeUnits.js).

const toError = (err, fallback) => {
  const data = err.response?.data;
  const msg = typeof data === "string" ? data : data?.message || err.message || fallback;
  const e = new Error([msg || fallback, data?.hint].filter(Boolean).join(" "));
  e.response = err.response;
  return e;
};

export async function fetchUnits() {
  try {
    const { data } = await axios.get("/employee-units");
    return data.units || [];
  } catch (err) {
    throw toError(err, "Failed to load employee units");
  }
}

export async function createUnit({ code, name }) {
  try {
    const { data } = await axios.post("/employee-units", { code, name });
    return data.unit;
  } catch (err) {
    throw toError(err, "Failed to add unit");
  }
}

export async function updateUnit({ id, ...changes }) {
  try {
    const { data } = await axios.patch(`/employee-units/${id}`, changes);
    return data.unit;
  } catch (err) {
    throw toError(err, "Failed to update unit");
  }
}

export async function deleteUnit(id) {
  try {
    await axios.delete(`/employee-units/${id}`);
    return id;
  } catch (err) {
    throw toError(err, "Failed to delete unit");
  }
}
