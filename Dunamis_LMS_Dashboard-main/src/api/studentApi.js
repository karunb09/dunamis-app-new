import axios from "./axios";

// Pure data-access for the Student domain (admin student-management screens).
// Caching/loading/error are owned by TanStack Query (see hooks/useStudents.js).
// The bearer token is attached by the axios request interceptor.

const toError = (err, fallback) => {
  const data = err.response?.data;
  const msg = typeof data === "string" ? data : data?.message || err.message || fallback;
  const e = new Error(msg || fallback);
  e.response = err.response;
  return e;
};

// Returns the grouped-by-type shape the UI expects, e.g. { enrolled: [...], ... }.
export async function fetchStudentsByType(type) {
  try {
    const { data } = await axios.get("/student/get-by-type", {
      params: type ? { type } : {},
    });
    return data;
  } catch (err) {
    throw toError(err, "Failed to load students");
  }
}

export async function fetchStudentById(id) {
  try {
    const { data } = await axios.get(`/student/${id}`);
    return data?.student ?? null;
  } catch (err) {
    throw toError(err, "Failed to load student");
  }
}
