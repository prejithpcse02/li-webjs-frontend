// API service for handling communication with the backend
import axios from "axios";

// Create an axios instance with default config
//const API_BASE_URL = "http://127.0.0.1:8000";
//const API_BASE_URL = "https://backend-listtra.onrender.com";
const API_BASE_URL = "https://backend-deployment-li-2.onrender.com";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add interceptor to include auth token in requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and we haven't tried to refresh the token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        // Try to refresh the token
        const response = await axios.post(
          `${API_BASE_URL}/api/token/refresh/`,
          {
            refresh: refreshToken,
          }
        );

        const { access } = response.data;
        localStorage.setItem("token", access);

        // Update the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear tokens and redirect to login
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        window.location.href = "/auth/signin";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Authentication APIs
export const authAPI = {
  // Login user and get token
  login: async (email, password) => {
    try {
      const response = await api.post("/api/token/", { email, password });
      return response.data;
    } catch (error) {
      console.error("Login API error:", error);
      throw error;
    }
  },

  // Register new user
  register: async (userData) => {
    try {
      console.log("Registering user with data:", userData);
      const response = await api.post("/api/register/", userData);
      console.log("Registration successful:", response.data);
      return response.data;
    } catch (error) {
      console.error("Registration error:", error);
      if (axios.isAxiosError(error)) {
        console.error("Error status:", error.response?.status);
        console.error("Error data:", error.response?.data);
      }
      throw error;
    }
  },

  // Get current user profile
  getProfile: async () => {
    try {
      const response = await api.get("/api/profile/");
      return response.data;
    } catch (error) {
      console.error("Get profile error:", error);
      throw error;
    }
  },
};

// Export the base API for other services to use
export default api;
