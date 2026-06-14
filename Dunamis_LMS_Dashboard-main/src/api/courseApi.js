import axios from "./axios";
import { getStoredToken, getStoredUser } from "../utils/authSession";

// Pure data-access functions for the Course domain. These hold the same
// admin-vs-public routing and auth-header logic the Redux thunks used, but with
// zero store/caching concerns — caching, dedup, loading/error state are owned by
// TanStack Query (see hooks/useCourses.js).

const getErrorMessage = (data, fallback) => {
  if (typeof data === "string") return data;
  if (data?.message && typeof data.message === "string") return data.message;
  if (data?.error && typeof data.error === "string") return data.error;
  return fallback || "Something went wrong";
};

const resolveAccountType = () => {
  const user = getStoredUser();
  return user?.accountType || user?.role || user?.roleId?.accountType || "";
};

const isAdminRole = () => {
  const accountType = String(resolveAccountType()).toLowerCase();
  return ["admin", "superadmin"].includes(accountType);
};

const authHeaders = () => {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Normalises axios errors into a thrown Error with a useful message so React
// Query's `error` carries something renderable.
const toError = (err, fallback) => {
  const e = new Error(getErrorMessage(err.response?.data, fallback) || err.message);
  e.response = err.response;
  return e;
};

export async function fetchCourses() {
  try {
    const usePrivateRoute = isAdminRole();
    const endpoint = usePrivateRoute ? "/course/manage" : "/course/get";
    const headers = usePrivateRoute ? authHeaders() : {};
    if (usePrivateRoute && !headers.Authorization) {
      throw new Error("Authentication required");
    }
    const { data } = await axios.get(endpoint, { headers });
    return Array.isArray(data) ? data : data.data || [];
  } catch (err) {
    throw toError(err, "Failed to load courses");
  }
}

export async function fetchCourseDetails(courseId) {
  try {
    const usePrivateRoute = isAdminRole();
    const endpoint = usePrivateRoute
      ? `/course/manage/${courseId}`
      : `/course/get/${courseId}`;
    const headers = usePrivateRoute ? authHeaders() : {};
    if (usePrivateRoute && !headers.Authorization) {
      throw new Error("Authentication required");
    }
    const { data } = await axios.get(endpoint, { headers });
    return data.data;
  } catch (err) {
    throw toError(err, "Failed to load course");
  }
}

export async function createCourse(formData) {
  try {
    const headers = authHeaders();
    if (!headers.Authorization) throw new Error("Authentication required");
    const { data } = await axios.post("/course/create", formData, {
      headers: { ...headers, "Content-Type": "multipart/form-data" },
    });
    return data;
  } catch (err) {
    throw toError(err, "Failed to create course");
  }
}

export async function updateCourse({ courseId, updates }) {
  try {
    const headers = authHeaders();
    if (!headers.Authorization) throw new Error("Authentication required");
    const { data } = await axios.put(`/course/update/${courseId}`, updates, {
      headers: { ...headers, "Content-Type": "multipart/form-data" },
    });
    return data;
  } catch (err) {
    throw toError(err, "Failed to update course");
  }
}

export async function deleteCourse(courseId) {
  try {
    const headers = authHeaders();
    if (!headers.Authorization) throw new Error("Authentication required");
    await axios.delete(`/course/delete/${courseId}`, { headers });
    return courseId;
  } catch (err) {
    throw toError(err, "Failed to delete course");
  }
}
