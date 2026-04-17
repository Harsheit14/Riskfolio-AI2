import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import PortfolioPage from "./pages/PortfolioPage";
import RiskReportPage from "./pages/RiskReportPage";
import authService from "./services/authService";
import Alert from "./components/Alert";

/**
 * Protected Route Component
 * Redirects to login if not authenticated
 */
function ProtectedRoute({ element, isAuthenticated }) {
  return isAuthenticated ? element : <Navigate to="/login" replace />;
}

/**
 * Public Route Component
 * Redirects to dashboard if already authenticated
 */
function PublicRoute({ element, isAuthenticated }) {
  return !isAuthenticated ? element : <Navigate to="/dashboard" replace />;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alertMessage, setAlertMessage] = useState(null);

  // Check if user is logged in on app load
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated();
      setIsAuthenticated(authenticated);
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Listen for logout events
  useEffect(() => {
    const handleLogout = () => {
      setIsAuthenticated(false);
      setAlertMessage({
        type: "info",
        title: "Logged Out",
        message: "You have been logged out successfully.",
      });
      setTimeout(() => setAlertMessage(null), 3000);
    };

    window.addEventListener("logout", handleLogout);
    return () => window.removeEventListener("logout", handleLogout);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full mx-auto" style={{ animation: 'spin 1s linear infinite' }}></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        {/* Alert Messages */}
        {alertMessage && (
          <div className="fixed top-4 right-4 z-50 w-96">
            <Alert
              type={alertMessage.type}
              title={alertMessage.title}
              message={alertMessage.message}
              onClose={() => setAlertMessage(null)}
            />
          </div>
        )}

        {/* Navbar - Show if authenticated */}
        {isAuthenticated && <Navbar />}

        {/* Main Routes */}
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute
                element={<LoginPage />}
                isAuthenticated={isAuthenticated}
              />
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute
                element={<RegisterPage />}
                isAuthenticated={isAuthenticated}
              />
            }
          />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute
                element={<DashboardPage />}
                isAuthenticated={isAuthenticated}
              />
            }
          />
          <Route
            path="/portfolio"
            element={
              <ProtectedRoute
                element={<PortfolioPage />}
                isAuthenticated={isAuthenticated}
              />
            }
          />
          <Route
            path="/risk-report"
            element={
              <ProtectedRoute
                element={<RiskReportPage />}
                isAuthenticated={isAuthenticated}
              />
            }
          />

          {/* Default Route */}
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;