import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/**
 * ProtectedRoute component
 * Redirects to /login if user is not authenticated
 * Otherwise renders the route content
 */
export default function ProtectedRoute() {
  const { isAuthenticated, isInitialized } = useAuth();

  // Wait for auth initialization
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f1117]">
        <p className="text-xl text-slate-300">Loading...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Render the protected route
  return <Outlet />;
}
