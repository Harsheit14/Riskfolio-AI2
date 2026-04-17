import { Link, useNavigate } from "react-router-dom";
import Button from "./Button";
import authService from "../services/authService";
import { useState, useEffect } from "react";

/**
 * Navbar Component
 * Main navigation bar
 */
export default function Navbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
  }, []);

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    // Dispatch logout event
    window.dispatchEvent(new Event("logout"));
    navigate("/login");
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container-custom flex-between py-4">
        {/* Logo */}
        <Link to="/dashboard" className="text-2xl font-bold text-blue-600 hover:text-blue-700">
          💰 Riskfolio AI
        </Link>

        {/* Navigation Links */}
        <div className="flex gap-6 items-center">
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Dashboard
              </Link>
              <Link
                to="/portfolio"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Portfolio
              </Link>
              <Link
                to="/risk-report"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Risk Analysis
              </Link>
              <div className="flex items-center gap-4 border-l border-gray-200 pl-6">
                <span className="text-gray-600 text-sm">
                  👤 <span className="font-medium">{user.email || "User"}</span>
                </span>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="secondary" size="sm">
                  Login
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  Register
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
