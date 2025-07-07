"use client"

import { createContext, useContext, useState, useEffect } from "react"

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  // Global token expiration checker
  useEffect(() => {
    let tokenCheckInterval = null

    const checkTokenExpiration = () => {
      const storedToken = localStorage.getItem("token")

      if (!storedToken) {
        return
      }

      try {
        const payload = JSON.parse(atob(storedToken.split(".")[1]))
        const currentTime = Date.now() / 1000
        const timeUntilExpiry = payload.exp - currentTime

        // If token expires in 5 minutes or less, show warning
        if (timeUntilExpiry <= 300 && timeUntilExpiry > 0) {
          // Dispatch custom event for notification component
          window.dispatchEvent(
            new CustomEvent("tokenExpiring", {
              detail: { timeUntilExpiry: timeUntilExpiry * 1000 },
            }),
          )
        } else if (timeUntilExpiry <= 0) {
          // Token has expired
          console.log("Token expired, logging out...")
          logout()
        }
      } catch (error) {
        console.error("Error checking token expiration:", error)
        logout()
      }
    }

    // Check token expiration every 30 seconds if user is authenticated
    if (token) {
      checkTokenExpiration() // Check immediately
      tokenCheckInterval = setInterval(checkTokenExpiration, 30000)
    }

    return () => {
      if (tokenCheckInterval) {
        clearInterval(tokenCheckInterval)
      }
    }
  }, [token])

  useEffect(() => {
    // Check for existing token on mount
    const storedToken = localStorage.getItem("token")
    const storedUser = localStorage.getItem("user")

    if (storedToken && storedUser) {
      try {
        // Verify token is not expired
        const payload = JSON.parse(atob(storedToken.split(".")[1]))
        const currentTime = Date.now() / 1000

        if (payload.exp > currentTime) {
          setToken(storedToken)
          setUser(JSON.parse(storedUser))
        } else {
          // Token expired, clear storage
          localStorage.removeItem("token")
          localStorage.removeItem("user")
          localStorage.removeItem("userRole")
        }
      } catch (error) {
        console.error("Error parsing stored token:", error)
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        localStorage.removeItem("userRole")
      }
    }

    setLoading(false)

    // Listen for token expiration events from API calls
    const handleTokenExpiration = () => {
      console.log("Token expiration event received in AuthContext")
      logout()
    }

    window.addEventListener("tokenExpired", handleTokenExpiration)

    return () => {
      window.removeEventListener("tokenExpired", handleTokenExpiration)
    }
  }, [])

  const login = (userData, authToken) => {
    setUser(userData)
    setToken(authToken)
    localStorage.setItem("user", JSON.stringify(userData))
    localStorage.setItem("token", authToken)
    localStorage.setItem("userRole", userData.roleid || userData.role)
  }

  const logout = () => {
    console.log("Logging out user...")
    setUser(null)
    setToken(null)
    localStorage.removeItem("user")
    localStorage.removeItem("token")
    localStorage.removeItem("userRole")

    // Clear any intervals or timeouts
    window.dispatchEvent(new CustomEvent("userLoggedOut"))

    // Redirect to login page
    window.location.href = "/"
  }

  const value = {
    user,
    token,
    login,
    logout,
    loading,
    isAuthenticated: !!token,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
