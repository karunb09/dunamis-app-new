import axios from "axios";
import { clearAuthSession } from "../utils/authSession";

const instance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
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
