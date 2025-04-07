"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { authAPI } from "@/services/api";

const AuthContext = createContext({
  user: null,
  isLoading: false,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  clearError: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const userData = await authAPI.getProfile();
        setUser(userData);
      } catch (err) {
        console.error("Error fetching user profile:", err);
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("Logging in with:", { email });
      const { access, refresh } = await authAPI.login(email, password);
      console.log("Login successful, tokens received");

      localStorage.setItem("token", access);
      localStorage.setItem("refreshToken", refresh);

      const userData = await authAPI.getProfile();
      setUser(userData);

      router.push("/listings");
    } catch (err) {
      console.error("Login error:", err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || "Login failed");
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    setIsLoading(true);
    setError(null);

    try {
      await authAPI.register(userData);
      await login(userData.email, userData.password);
    } catch (err) {
      console.error("Registration error:", err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || "Registration failed");
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    setUser(null);
    router.push("/auth/signin");
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

{
  /*
{isOwner && (
  <div className="absolute top-2 left-2 z-50 flex space-x-2">
    <button
      onClick={handleEdit}
      className="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded-full shadow-md"
      title="Edit Listing"
    >
      <FiEdit2 className="h-4 w-4" />
    </button>
    <button
      onClick={() => setShowDeleteConfirm(true)}
      className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-md"
      title="Delete Listing"
    >
      <FiTrash2 className="h-4 w-4" />
    </button>
  </div>
)}
*/
}
