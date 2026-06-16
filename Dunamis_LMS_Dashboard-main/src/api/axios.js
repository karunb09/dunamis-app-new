import axios from "axios";
import { clearAuthSession, getStoredToken } from "../utils/authSession";

const instance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Single token path for the Query layer: attach the bearer here so data-access
// modules (courseApi, studentApi, …) never hand-roll Authorization headers.
instance.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthSession();
      window.location.replace("/");
    }
    return Promise.reject(error);
  }
);

export default instance;
