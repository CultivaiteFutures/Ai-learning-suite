import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT to every outgoing request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ails_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global 401 handling — force logout on token expiry/invalidity
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("ails_token");
      localStorage.removeItem("ails_auth_user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;