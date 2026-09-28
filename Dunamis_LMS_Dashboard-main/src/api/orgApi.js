import axios from "./axios";

// Pure data-access for the org structure (staff placement, reporting chart,
// zones). Caching/loading/error are owned by TanStack Query (hooks/useOrg.js).

// Carries the server's `hint` through: a refusal usually names who can make
// the change or what has to move first.
const toError = (err, fallback) => {
  const data = err.response?.data;
  const msg = typeof data === "string" ? data : data?.message || err.message || fallback;
  const e = new Error([msg || fallback, data?.hint].filter(Boolean).join(" "));
  e.response = err.response;
  return e;
};

export async function fetchStaffDirectory() {
  try {
    const { data } = await axios.get("/org/staff");
    return data.staff || [];
  } catch (err) {
    throw toError(err, "Failed to load staff");
  }
}

export async function fetchMyScope() {
  try {
    const { data } = await axios.get("/org/me/scope");
    return data;
  } catch (err) {
    throw toError(err, "Failed to load your area");
  }
}

export async function fetchOrgChart() {
  try {
    const { data } = await axios.get("/org/chart");
    return data;
  } catch (err) {
    throw toError(err, "Failed to load the reporting structure");
  }
}

export async function saveOrgPlacement({ userId, org, branchIds }) {
  try {
    const { data } = await axios.patch(`/user/${userId}/org`, {
      org,
      ...(branchIds !== undefined ? { branchIds } : {}),
    });
    return data.org;
  } catch (err) {
    throw toError(err, "Failed to save the reporting line");
  }
}

export async function fetchZones() {
  try {
    const { data } = await axios.get("/zone");
    return data.zones || [];
  } catch (err) {
    throw toError(err, "Failed to load zones");
  }
}

export async function createZone({ name, city }) {
  try {
    const { data } = await axios.post("/zone", { name, city });
    return data.zone;
  } catch (err) {
    throw toError(err, "Failed to create zone");
  }
}

export async function renameZone({ id, name }) {
  try {
    const { data } = await axios.put(`/zone/${id}`, { name });
    return data.zone;
  } catch (err) {
    throw toError(err, "Failed to rename zone");
  }
}

export async function deleteZone(id) {
  try {
    await axios.delete(`/zone/${id}`);
    return id;
  } catch (err) {
    throw toError(err, "Failed to delete zone");
  }
}
