import apiClient from "./apiClient";
import { API_ENDPOINTS } from "../constants/api";

/**
 * Auth Service
 * Handles all authentication API calls
 */

export const authService = {
  /**
   * Register new user
   */
  register: async (email, password) => {
    try {
      console.log("[AUTH SERVICE] Registering user:", { email });
      
      const response = await apiClient.post(API_ENDPOINTS.AUTH_REGISTER, {
        email,
        password,
      });

      console.log("[AUTH SERVICE] Registration successful:", response.data);

      // Store token if returned
      if (response.data.data?.token) {
        const { token, ...userData } = response.data.data;
        localStorage.setItem("authToken", token);
        localStorage.setItem("user", JSON.stringify(userData));
      }

      return response.data;
    } catch (error) {
      console.error("[AUTH SERVICE] Registration failed:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        code: error.code,
      });
      throw error;
    }
  },

  /**
   * Login user
   */
  login: async (email, password) => {
    try {
      console.log("[AUTH SERVICE] Logging in user:", { email });

      const response = await apiClient.post(API_ENDPOINTS.AUTH_LOGIN, {
        email,
        password,
      });

      console.log("[AUTH SERVICE] Login successful:", response.data);

      // Store token if returned
      if (response.data.data?.token) {
        const { token, ...userData } = response.data.data;
        localStorage.setItem("authToken", token);
        localStorage.setItem("user", JSON.stringify(userData));
      }

      return response.data;
    } catch (error) {
      console.error("[AUTH SERVICE] Login failed:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        code: error.code,
      });
      throw error;
    }
  },

  /**
   * Logout user
   */
  logout: () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
  },

  /**
   * Get current user from localStorage
   */
  getCurrentUser: () => {
    const user = localStorage.getItem("user");
    try {
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: () => {
    return !!localStorage.getItem("authToken");
  },
};

export default authService;