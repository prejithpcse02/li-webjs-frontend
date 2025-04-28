// API service for handling communication with the backend
import axios from "axios";

// Create an axios instance with default config
const API_BASE_URL = "http://127.0.0.1:8000";
//const API_BASE_URL = "https://backend-listtra.onrender.com";
//const API_BASE_URL = "https://backend-deployment-li-2.onrender.com";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Function to handle API errors
export const handleApiError = (error) => {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.error("API Error Response:", error.response.data);
    return error.response.data;
  } else if (error.request) {
    // The request was made but no response was received
    console.error("API Error Request:", error.request);
    return { error: "No response received from server" };
  } else {
    // Something happened in setting up the request that triggered an Error
    console.error("API Error:", error.message);
    return { error: error.message };
  }
};

// Function to set the token in localStorage and update headers
const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem("token", token);
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    localStorage.removeItem("token");
    delete api.defaults.headers.common["Authorization"];
  }
};

// Function to set the refresh token in localStorage
const setRefreshToken = (token) => {
  if (token) {
    localStorage.setItem("refreshToken", token);
  } else {
    localStorage.removeItem("refreshToken");
  }
};

// Add interceptor to include auth token in requests
api.interceptors.request.use(
  (config) => {
    // Always check for token in localStorage for each request
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
        setAuthToken(access);

        // Update the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear tokens and redirect to login
        setAuthToken(null);
        setRefreshToken(null);

        // Only redirect if we're not already on the login page
        if (!window.location.pathname.includes("/auth/signin")) {
          window.location.href = "/auth/signin";
        }
        return Promise.reject(refreshError);
      }
    }

    // If the error is 403, it means the user doesn't have permission
    if (error.response?.status === 403) {
      console.error("Permission denied:", error.response?.data);
      // Check if it's an authentication issue
      if (
        error.response?.data?.detail ===
        "Authentication credentials were not provided."
      ) {
        // Try to get the token from localStorage and set it in the headers
        const token = localStorage.getItem("token");
        if (token) {
          setAuthToken(token);
          // Retry the original request with the token
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        } else {
          // If no token, clear everything and redirect
          setAuthToken(null);
          setRefreshToken(null);

          // Only redirect if we're not already on the login page
          if (!window.location.pathname.includes("/auth/signin")) {
            window.location.href = "/auth/signin";
          }
        }
      }
      return Promise.reject(
        new Error(
          error.response?.data?.detail ||
            "You don't have permission to perform this action"
        )
      );
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
      // Store tokens immediately after successful login
      if (response.data.access) {
        setAuthToken(response.data.access);
        setRefreshToken(response.data.refresh);
      }
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

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem("token");
    return !!token;
  },

  // Logout user
  logout: () => {
    setAuthToken(null);
    setRefreshToken(null);
    window.location.href = "/auth/signin";
  },
};

// Export the base API for other services to use
export default api;
