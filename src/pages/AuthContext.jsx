"use client"

import { createContext, useContext, useState, useEffect } from "react"

// Create the context
const AuthContext = createContext(null)

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext)

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  // Check if user is logged in on initial load
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token")
      const userData = localStorage.getItem("user")

      if (token && userData) {
        setUser(JSON.parse(userData))
        setIsAuthenticated(true)
      }

      setLoading(false)
    }

    checkAuth()
  }, [])

  // Login function
  const login = (userData, token) => {
    localStorage.setItem("token", token)
    localStorage.setItem("user", JSON.stringify(userData))
    setUser(userData)
    setIsAuthenticated(true)
  }

  // Logout function
  const logout = async () => {
    try {
      // Call the logout endpoint
      await fetch("http://localhost:5000/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }).catch((error) => {
        console.log("Logout endpoint not available, continuing with client-side logout")
      })

      // Clear localStorage
      localStorage.removeItem("token")
      localStorage.removeItem("user")

      // Update state
      setUser(null)
      setIsAuthenticated(false)

      return true
    } catch (error) {
      console.error("Logout failed:", error)
      return false
    }
  }

  // Auth context value
  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
