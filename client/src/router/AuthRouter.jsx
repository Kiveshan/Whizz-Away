import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

/**
 * Determines the correct post-login route from subscription state.
 * Used both in Login.jsx redirect and as a route guard component.
 */
export function getPostLoginRoute(tier, status, roleid) {
  // Super admin bypasses subscription checks
  if (roleid === 7) return "/AdminDashboard"

  if (status === "suspended")                                    return "/suspended"
  if (status === "cancelled")                                    return "/account-cancelled"
  if (!status || status === "inactive" || !tier || tier === "none") return "/pending-activation"
  if (status === "trial")                                        return "/dashboard"
  if (tier === "lite")                                           return "/dashboard/lite"

  // Creditors (roleid 8) require enterprise plan - keep on login page if not enterprise
  if (roleid === 8) {
    if (tier === "enterprise") return "/CreditorsDashboard"
    return "/login?upgrade=enterprise" // Stay on login page with upgrade prompt
  }

  // Professional / Growth / Enterprise — role-based
  if (roleid === 1) return "/Dashboard"
  if (roleid === 2) return "/ControllerDashboard"
  if (roleid === 3) return "/FDashboard"
  if (roleid === 4) return "/DirectorDashboard"
  if (roleid === 7) return "/AdminDashboard"
  return "/Dashboard"
}

/**
 * SubscriptionGuard — wrap any route that should be inaccessible
 * when the company's subscription is not in an allowed state.
 *
 * Usage:
 *   <Route path="/dashboard/lite" element={
 *     <SubscriptionGuard allowedTiers={["lite"]} allowedStatuses={["active"]}>
 *       <LiteDashboard />
 *     </SubscriptionGuard>
 *   } />
 */
export function SubscriptionGuard({ children, allowedTiers, allowedStatuses }) {
  const { user, loading, isAuthenticated } = useAuth()

  if (loading) return null

  if (!isAuthenticated) return <Navigate to="/login" replace />

  const tier   = user?.subscription_tier   || "none"
  const status = user?.subscription_status || "inactive"

  if (allowedStatuses && !allowedStatuses.includes(status)) {
    return <Navigate to={getPostLoginRoute(tier, status, user?.roleid)} replace />
  }

  if (allowedTiers && !allowedTiers.includes(tier)) {
    return <Navigate to={getPostLoginRoute(tier, status, user?.roleid)} replace />
  }

  return children
}

/**
 * RequireAuth — simple authenticated-only guard, no subscription check.
 */
export function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

/**
 * PostLoginRedirect — placed at /login-redirect to bounce users
 * to the correct dashboard after login without hard-coding routes in Login.jsx.
 */
export default function PostLoginRedirect() {
  const { user, isAuthenticated, loading } = useAuth()

  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />

  const tier   = user?.subscription_tier   || "none"
  const status = user?.subscription_status || "inactive"
  const route  = getPostLoginRoute(tier, status, user?.roleid)

  return <Navigate to={route} replace />
}
