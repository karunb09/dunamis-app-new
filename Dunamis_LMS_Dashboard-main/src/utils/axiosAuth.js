import axios from "axios";
import { getStoredToken } from "./authSession";

const axiosAuth = axios.create();

axiosAuth.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosAuth;
