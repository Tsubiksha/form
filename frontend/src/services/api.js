import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
});

API.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401 && !error.config?.url?.startsWith("/auth/")) {
    sessionStorage.removeItem("access_token"); sessionStorage.removeItem("refresh_token");
    window.dispatchEvent(new Event("auth:expired"));
  }
  return Promise.reject(error);
});

export default API;
