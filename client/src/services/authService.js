import apiClient from "./api";
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
    const response = await apiClient.post(API_ENDPOINTS.AUTH_REGISTER, {
      email,
      password,
    });

    // Store token if returned
    if (response.data.data?.token) {
      const { token, ...userData } = response.data.data;
      localStorage.setItem("authToken", token);
      localStorage.setItem("user", JSON.stringify(userData));
    }

    return response.data;
  },

  /**
   * Login user
   */
  login: async (email, password) => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH_LOGIN, {
      email,
      password,
    });

    // Store token if returned
    if (response.data.data?.token) {
      const { token, ...userData } = response.data.data;
      localStorage.setItem("authToken", token);
      localStorage.setItem("user", JSON.stringify(userData));
    }

    return response.data;
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
      return user ? JSON.parse(user) : null; // FIX 2: wrap JSON.parse in try/catch
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