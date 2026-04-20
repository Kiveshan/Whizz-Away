import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Maps each roleid to its home dashboard route
const ROLE_HOME = {
  1: "/Dashboard",
  2: "/ControllerDashboard",
  3: "/FDashboard",
  4: "/DirectorDashboard",
  7: "/AdminDashboard",
  8: "/CreditorsDashboard",
};

/**
 * ProtectedRoute
 *
 * Props:
 *   allowedRoles  – array of roleids that may access this route (optional).
 *                   If omitted, any authenticated user is allowed.
 *   children      – the page component to render when access is granted.
 *
 * Behaviour:
 *   - Unauthenticated  → redirect to "/" (landing / login)
 *   - Wrong role       → redirect to the user's own home dashboard
 *   - Loading state    → render nothing while auth initialises
 */
const ProtectedRoute = ({ allowedRoles, children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.roleid)) {
    const home = ROLE_HOME[user?.roleid] || "/";
    return <Navigate to={home} replace />;
  }

  return children;
};

export default ProtectedRoute;
