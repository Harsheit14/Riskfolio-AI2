import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useState } from "react";

/**
 * Navbar Component
 * Dark theme navigation bar with responsive hamburger menu
 */
export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  const navLinkClass = (path) =>
    `text-sm font-medium transition-all duration-200 ${
      isActive(path)
        ? "text-indigo-400 border-b-2 border-indigo-400 pb-1"
        : "text-slate-400 hover:text-slate-300"
    }`;

  return (
    <nav className="sticky top-0 z-40 bg-[#0f1117]/95 backdrop-blur-sm border-b border-white/5 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-xl font-bold"
          >
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Riskfolio AI
            </span>
          </Link>

          {/* Desktop Navigation */}
          {isAuthenticated && user && (
            <div className="hidden md:flex items-center gap-8">
              <Link to="/dashboard" className={navLinkClass("/dashboard")}>
                Dashboard
              </Link>
              <Link to="/portfolio" className={navLinkClass("/portfolio")}>
                Portfolio
              </Link>
              <Link to="/risk" className={navLinkClass("/risk")}>
                Risk Report
              </Link>
            </div>
          )}

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-4 ml-auto">
            {isAuthenticated && user ? (
              <>
                <span className="text-sm text-slate-400">
                  👤 <span className="text-slate-200 font-medium">{user.email}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all duration-200"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-sm font-medium hover:bg-white/5 transition-all duration-200"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all duration-200"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-slate-300"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  mobileMenuOpen
                    ? "M6 18L18 6M6 6l12 12"
                    : "M4 6h16M4 12h16M4 18h16"
                }
              />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && isAuthenticated && user && (
          <div className="md:hidden border-t border-white/5 py-4 space-y-3">
            <Link
              to="/dashboard"
              className="block px-4 py-2 text-slate-400 hover:text-slate-300 text-sm"
              onClick={() => setMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              to="/portfolio"
              className="block px-4 py-2 text-slate-400 hover:text-slate-300 text-sm"
              onClick={() => setMobileMenuOpen(false)}
            >
              Portfolio
            </Link>
            <Link
              to="/risk"
              className="block px-4 py-2 text-slate-400 hover:text-slate-300 text-sm"
              onClick={() => setMobileMenuOpen(false)}
            >
              Risk Report
            </Link>
            <div className="border-t border-white/5 pt-3 mt-3 px-4">
              <p className="text-xs text-slate-500 mb-3">
                {user.email}
              </p>
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
