"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}

// ─── Plan helpers (pure functions, no React needed) ──────────────────────────

const PLAN_RANK = { lite: 1, professional: 2, growth: 3, enterprise: 4 }

function decodeToken(token) {
  if (!token) return null
  try {
    return JSON.parse(atob(token.split(".")[1]))
  } catch {
    return null
  }
}

function buildSubscription(userData) {
  if (!userData) return null
  return {
    tier:           userData.subscription_tier   || "none",
    status:         userData.subscription_status || "inactive",
    trial_ends_at:  userData.trial_ends_at       || null,
    company_reg_num: userData.company_reg_num    || null,
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null)
  const [token, setToken]     = useState(null)
  const [loading, setLoading] = useState(true)

  const isTokenExpired = useCallback((t) => {
    const payload = decodeToken(t)
    if (!payload) return true
    return payload.exp < Date.now() / 1000
  }, [])

  const getTokenExpirationTime = useCallback((t) => {
    const payload = decodeToken(t)
    return payload ? payload.exp * 1000 : null
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setToken(null)
    setUser(null)
    window.dispatchEvent(new CustomEvent("userLoggedOut"))
    window.location.href = "/"
  }, [])

  const login = useCallback((userData, authToken) => {
    localStorage.setItem("token", authToken)
    localStorage.setItem("user", JSON.stringify(userData))
    setToken(authToken)
    setUser(userData)
  }, [])

  const checkTokenExpiration = useCallback(() => {
    const currentToken = localStorage.getItem("token")
    if (!currentToken) return
    const expirationTime = getTokenExpirationTime(currentToken)
    if (!expirationTime) { logout(); return }
    const timeUntilExpiry = expirationTime - Date.now()
    if (timeUntilExpiry <= 0) { logout(); return }
    if (timeUntilExpiry <= 120000) {
      window.dispatchEvent(new CustomEvent("tokenExpiring", { detail: { timeUntilExpiry } }))
    }
  }, [getTokenExpirationTime, logout])

  useEffect(() => {
    const storedToken = localStorage.getItem("token")
    const storedUser  = localStorage.getItem("user")
    if (storedToken && storedUser) {
      try {
        if (!isTokenExpired(storedToken)) {
          setToken(storedToken)
          setUser(JSON.parse(storedUser))
        } else {
          localStorage.removeItem("token")
          localStorage.removeItem("user")
        }
      } catch {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
      }
    }
    setLoading(false)
  }, [isTokenExpired])

  useEffect(() => {
    if (!token || isTokenExpired(token)) return
    const id = setInterval(checkTokenExpiration, 10000)
    checkTokenExpiration()
    return () => clearInterval(id)
  }, [token, isTokenExpired, checkTokenExpiration])

  useEffect(() => {
    const onExpired   = () => logout()
    const onLoggedOut = () => { setUser(null); setToken(null) }
    window.addEventListener("tokenExpired",   onExpired)
    window.addEventListener("userLoggedOut",  onLoggedOut)
    return () => {
      window.removeEventListener("tokenExpired",  onExpired)
      window.removeEventListener("userLoggedOut", onLoggedOut)
    }
  }, [logout])

  // ─── Subscription helpers ─────────────────────────────────────────────────

  const subscription = buildSubscription(user)

  /** Returns true if the company's plan ranks at or above `minimumPlan`. */
  const hasPlan = useCallback((minimumPlan) => {
    const tier = user?.subscription_tier || "none"
    return (PLAN_RANK[tier] ?? 0) >= (PLAN_RANK[minimumPlan] ?? 99)
  }, [user])

  /**
   * Returns true if `feature_key` is available on the current plan.
   * Uses the static feature map (no DB call) for instant UI decisions.
   */
  const PLAN_FEATURES = {
    lite:         ["instructions", "assignment", "invoice", "statements", "manage"],
    professional: ["instructions", "assignment", "invoice", "statements", "manage", "addons", "analytics", "reports"],
    growth:       ["instructions", "assignment", "invoice", "statements", "manage", "addons", "analytics", "reports", "payroll", "biometric", "vat"],
    enterprise:   ["instructions", "assignment", "invoice", "statements", "manage", "addons", "analytics", "reports", "payroll", "biometric", "vat", "creditors", "priority_support"],
  }

  const hasFeature = useCallback((feature_key) => {
    const tier = user?.subscription_tier || "none"
    return (PLAN_FEATURES[tier] || []).includes(feature_key)
  }, [user])

  /** True when the company is on an active trial. */
  const isTrial = useCallback(() => {
    return user?.subscription_status === "trial"
  }, [user])

  /** Days remaining in trial (null if not on trial). */
  const trialDaysRemaining = useCallback(() => {
    if (!isTrial() || !user?.trial_ends_at) return null
    const diff = new Date(user.trial_ends_at) - new Date()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }, [user, isTrial])

  /**
   * Returns { tier, status, maxUsers, maxTrucks }.
   * maxUsers/maxTrucks are populated from the JWT; real counts require an API call.
   */
  const getUsage = useCallback(() => {
    const PLAN_LIMITS = {
      lite:         { maxUsers: 2,   maxTrucks: 5   },
      professional: { maxUsers: 5,   maxTrucks: 15  },
      growth:       { maxUsers: 15,  maxTrucks: 40  },
      enterprise:   { maxUsers: 999, maxTrucks: 999 },
    }
    const tier = user?.subscription_tier || "none"
    const limits = PLAN_LIMITS[tier] || { maxUsers: 0, maxTrucks: 0 }
    return { tier, status: user?.subscription_status || "inactive", ...limits }
  }, [user])

  /** Derive the correct post-login route from subscription state. */
  const getPostLoginRoute = useCallback((roleid) => {
    const status = user?.subscription_status || "inactive"
    const tier   = user?.subscription_tier   || "none"

    if (status === "suspended")                          return "/suspended"
    if (status === "cancelled")                          return "/account-cancelled"
    if (status === "inactive" || status === "none" || tier === "none") return "/pending-activation"
    if (status === "trial")                              return "/dashboard"
    if (tier   === "lite")                               return "/dashboard/lite"

    // Standard role-based routing for professional/growth/enterprise
    if (roleid === 1) return "/Dashboard"
    if (roleid === 2) return "/ControllerDashboard"
    if (roleid === 3) return "/FDashboard"
    if (roleid === 4) return "/DirectorDashboard"
    if (roleid === 7) return "/AdminDashboard"
    if (roleid === 8) return "/CreditorsDashboard"
    return "/Dashboard"
  }, [user])

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!token && !!user && !isTokenExpired(token),
    // Subscription
    subscription,
    hasPlan,
    hasFeature,
    isTrial,
    trialDaysRemaining,
    getUsage,
    getPostLoginRoute,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext
