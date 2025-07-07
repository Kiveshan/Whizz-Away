"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"


const TokenExpiryNotification = () => {
  const [showWarning, setShowWarning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const { token, logout } = useAuth()

  useEffect(() => {
    let countdownInterval = null

    const handleTokenExpiring = (event) => {
      const { timeUntilExpiry } = event.detail
      const secondsLeft = Math.floor(timeUntilExpiry / 1000)

      setShowWarning(true)
      setTimeLeft(secondsLeft)

      countdownInterval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval)
            setShowWarning(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    const handleTokenExpired = () => {
      setShowWarning(false)
      if (countdownInterval) clearInterval(countdownInterval)
    }

    const handleUserLoggedOut = () => {
      setShowWarning(false)
      if (countdownInterval) clearInterval(countdownInterval)
    }

    window.addEventListener("tokenExpiring", handleTokenExpiring)
    window.addEventListener("tokenExpired", handleTokenExpired)
    window.addEventListener("userLoggedOut", handleUserLoggedOut)

    return () => {
      window.removeEventListener("tokenExpiring", handleTokenExpiring)
      window.removeEventListener("tokenExpired", handleTokenExpired)
      window.removeEventListener("userLoggedOut", handleUserLoggedOut)
      if (countdownInterval) clearInterval(countdownInterval)
    }
  }, [])

  const handleExtendSession = async () => {
    try {
      setShowWarning(false)
      console.log("Session extension requested - implement refresh token logic here")
    } catch (error) {
      console.error("Failed to extend session:", error)
      logout()
    }
  }

  const handleDismiss = () => {
    setShowWarning(false)
  }

  if (!showWarning || !token) return null

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <div className="popup-backdrop">
      <div className={`popup-container ${showWarning ? "popup-show" : ""}`}>
        <button className="popup-close" onClick={handleDismiss}>
          <svg className="close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="popup-header">
          <div className="header-content">
            <svg className="warning-icon animate-pulse" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3>Session Expiring Soon</h3>
              <p>Your session will expire automatically</p>
            </div>
          </div>
        </div>
        <div className="popup-content">
          <div className="countdown">
            <div className="timer-circle">
              <span>{minutes}:{seconds.toString().padStart(2, "0")}</span>
            </div>
            <p>Time remaining until automatic logout</p>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${Math.max(0, (timeLeft / 300) * 100)}%` }}
            />
          </div>
          <div className="action-buttons">
            <button className="continue-button" onClick={handleExtendSession}>
              Continue Session
            </button>
            <div className="secondary-buttons">
              <button className="dismiss-button" onClick={handleDismiss}>
                Dismiss
              </button>
              <button className="logout-button" onClick={logout}>
                Logout Now
              </button>
            </div>
          </div>
        </div>
        <div className="popup-footer">
          <p>For security reasons, inactive sessions are automatically terminated</p>
        </div>
      </div>
    </div>
  )
}

export default TokenExpiryNotification