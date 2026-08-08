import axios from "./axios";

const toError = (err, fallback) => {
  const data = err.response?.data;
  const msg = typeof data === "string" ? data : data?.message || err.message || fallback;
  const e = new Error(msg || fallback);
  e.response = err.response;
  return e;
};

export async function reassignEnrollment(payload) {
  try {
    const { data } = await axios.patch("/enrollment/reassign", payload);
    return data;
  } catch (err) {
    throw toError(err, "Failed to reassign student");
  }
}
