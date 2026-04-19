import React, { useState, useEffect } from "react";
import { AuthContext } from "./AuthContext";
import authService from "../services/authService";
import { jwtDecode } from "jwt-decode";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize: Load token from localStorage and restore user on mount
  useEffect(() => {
    const initializeAuth = () => {
      const storedToken = localStorage.getItem("authToken");
      if (storedToken) {
        try {
          const decoded = jwtDecode(storedToken);
          // Check if token is expired
          const now = Date.now() / 1000;
          if (decoded.exp > now) {
            setToken(storedToken);
            setUser({ userId: decoded.userId, email: decoded.email });
          } else {
            // Token expired, clear it
            localStorage.removeItem("authToken");
          }
        } catch (err) {
          console.error("[AUTH] Failed to decode token:", err.message);
          localStorage.removeItem("authToken");
        }
      }
      setIsInitialized(true);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      const result = await authService.login(email, password);

      // Extract token from response - the structure is { data: { token } }
      const jwtToken = result.data?.token;
      if (!jwtToken) {
        throw new Error("No token in login response");
      }

      // Decode token to extract user info
      const decoded = jwtDecode(jwtToken);

      // Store token and user (authService already stored authToken)
      setToken(jwtToken);
      setUser({ userId: decoded.userId, email: decoded.email });

      return result;
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || "Login failed";
      setError(errorMessage);
      setUser(null);
      setToken(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      const result = await authService.register(email, password);
      // Register doesn't return a token, user must login after
      return result;
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || "Registration failed";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setError(null);
  };

  const value = {
    user,
    token,
    error,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!token && !!user,
    isInitialized,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
