"use client"

import { useState } from "react"

const NotificationBell = ({ count, notifications, onRefresh }) => {
  const [showDropdown, setShowDropdown] = useState(false)

  const formatDate = (dateString) => {
    if (!dateString) return "No date"
    return new Date(dateString).toLocaleDateString()
  }

  const getDaysUntilExpiry = (expiryDate) => {
    if (!expiryDate) return 0
    const today = new Date()
    const expiry = new Date(expiryDate)
    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="notification-bell-container" style={{ position: "relative", display: "inline-block" }}>
      <button
        className="notification-bell"
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          position: "relative",
          padding: "5px",
          fontSize: "18px",
          color: count > 0 ? "#ff6b35" : "#666",
        }}
        title={`${count} truck license notifications`}
      >
        🔔
        {count > 0 && (
          <span
            className="notification-badge"
            style={{
              position: "absolute",
              top: "-2px",
              right: "-2px",
              backgroundColor: "#ff4444",
              color: "white",
              borderRadius: "50%",
              width: "20px",
              height: "20px",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              minWidth: "20px",
            }}
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {showDropdown && (
        <div
          className="notification-dropdown"
          style={{
            position: "absolute",
            top: "100%",
            right: "0",
            backgroundColor: "white",
            border: "1px solid #ddd",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            minWidth: "320px",
            maxWidth: "400px",
            maxHeight: "400px",
            overflowY: "auto",
            zIndex: 1000,
            marginTop: "5px",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #eee",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px 8px 0 0",
            }}
          >
            <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "600" }}>
              License Notifications {notifications.loading && "(Loading...)"}
            </h4>
            <button
              onClick={() => {
                onRefresh()
                setShowDropdown(false)
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "12px",
                color: "#666",
                padding: "4px 8px",
                borderRadius: "4px",
              }}
              title="Refresh notifications"
            >
              🔄
            </button>
          </div>

          {/* Show error if any */}
          {notifications.error && (
            <div
              style={{
                padding: "12px 16px",
                backgroundColor: "#fff5f5",
                color: "#c53030",
                fontSize: "12px",
                borderBottom: "1px solid #fed7d7",
              }}
            >
              Error: {notifications.error}
            </div>
          )}

          {count === 0 && !notifications.loading && !notifications.error ? (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                color: "#666",
                fontSize: "14px",
              }}
            >
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>✅</div>
              All truck licenses are current
            </div>
          ) : (
            <div style={{ maxHeight: "320px", overflowY: "auto" }}>
              {/* Expired Licenses */}
              {notifications.expired?.length > 0 && (
                <div>
                  <div
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#fff5f5",
                      borderBottom: "1px solid #fed7d7",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#c53030",
                    }}
                  >
                    🚨 EXPIRED LICENSES ({notifications.expired.length})
                  </div>
                  {notifications.expired.map((truck, index) => (
                    <div
                      key={`expired-${index}`}
                      style={{
                        padding: "12px 16px",
                        borderBottom: "1px solid #f0f0f0",
                        backgroundColor: "#fff5f5",
                      }}
                    >
                      <div style={{ fontWeight: "600", fontSize: "14px", color: "#c53030" }}>{truck.truckregnum}</div>
                      <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
                        Expired: {formatDate(truck.truck_license_expiry)}
                      </div>
                      <div style={{ fontSize: "11px", color: "#c53030", marginTop: "2px" }}>
                        {truck.days_expired} days overdue
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Expiring Soon */}
              {notifications.expiring?.length > 0 && (
                <div>
                  <div
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#fffbf0",
                      borderBottom: "1px solid #fed7aa",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#c05621",
                    }}
                  >
                    ⚠️ EXPIRING SOON ({notifications.expiring.length})
                  </div>
                  {notifications.expiring.map((truck, index) => (
                    <div
                      key={`expiring-${index}`}
                      style={{
                        padding: "12px 16px",
                        borderBottom: "1px solid #f0f0f0",
                        backgroundColor: "#fffbf0",
                      }}
                    >
                      <div style={{ fontWeight: "600", fontSize: "14px", color: "#c05621" }}>{truck.truckregnum}</div>
                      <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
                        Expires: {formatDate(truck.truck_license_expiry)}
                      </div>
                      <div style={{ fontSize: "11px", color: "#c05621", marginTop: "2px" }}>
                        {getDaysUntilExpiry(truck.truck_license_expiry)} days remaining
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div
            style={{
              padding: "8px 16px",
              borderTop: "1px solid #eee",
              backgroundColor: "#f8f9fa",
              borderRadius: "0 0 8px 8px",
              textAlign: "center",
            }}
          >
            <button
              onClick={() => setShowDropdown(false)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "12px",
                color: "#666",
                padding: "4px",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Overlay to close dropdown when clicking outside */}
      {showDropdown && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  )
}

export default NotificationBell
