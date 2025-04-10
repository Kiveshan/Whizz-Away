"use client"

import { useState } from "react"
import "../css/UserDetailView.css"

function UserDetailView({ user, onBack }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [showRejectConfirmation, setShowRejectConfirmation] = useState(false)

  const handleApprove = async () => {
    await updateUserStatus("approve")
  }

  // Modified to show confirmation popup instead of immediate rejection
  const handleReject = () => {
    setShowRejectConfirmation(true)
  }

  // New function to handle confirmed rejection
  const confirmReject = async () => {
    setShowRejectConfirmation(false)
    await updateUserStatus("reject")
  }

  // New function to cancel rejection
  const cancelReject = () => {
    setShowRejectConfirmation(false)
  }

  const updateUserStatus = async (action) => {
    try {
      setIsSubmitting(true)
      setError(null)

      // Retrieve token from localStorage
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No token provided. Please log in again.")
      }

      const response = await fetch(
        `http://localhost:5000/admin/${action === "approve" ? "approve-user" : "reject-user"}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // Add token in Authorization header
          },
          credentials: "include",
          body: JSON.stringify({
            userid: user.userid,
            ...(action === "approve" && { roleid: 1 }),
          }),
        },
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to update user status")
      }

      const result = await response.json()
      setSuccessMessage(result.message)

      // After 2 seconds, go back to the list
      setTimeout(() => {
        onBack()
      }, 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="user-detail-view">
      <button className="back-button" onClick={onBack}>
        &larr; Back to List
      </button>

      <h2>User Details</h2>

      {successMessage && <div className="success-message">{successMessage}</div>}

      {error && <div className="error-message">{error}</div>}

      <div className="user-details-container">
        <div className="user-detail-row">
          <div className="detail-label">User ID:</div>
          <div className="detail-value">{user.userid}</div>
        </div>

        <div className="user-detail-row">
          <div className="detail-label">Name:</div>
          <div className="detail-value">{user.name}</div>
        </div>

        <div className="user-detail-row">
          <div className="detail-label">Surname:</div>
          <div className="detail-value">{user.surname}</div>
        </div>

        <div className="user-detail-row">
          <div className="detail-label">Email:</div>
          <div className="detail-value">{user.email}</div>
        </div>

        <div className="user-detail-row">
          <div className="detail-label">Company:</div>
          <div className="detail-value">{user.companyname || "Not provided"}</div>
        </div>

        <div className="user-detail-row">
          <div className="detail-label">Registration Date:</div>
          <div className="detail-value">{new Date(user.dateofreg).toLocaleString()}</div>
        </div>
      </div>

      <div className="action-buttons">
        <button className="approve-button" onClick={handleApprove} disabled={isSubmitting || showRejectConfirmation}>
          {isSubmitting ? "Processing..." : "Approve User"}
        </button>

        <button className="reject-button" onClick={handleReject} disabled={isSubmitting || showRejectConfirmation}>
          {isSubmitting ? "Processing..." : "Reject User"}
        </button>
      </div>

      {/* Rejection Confirmation Popup */}
      {showRejectConfirmation && (
        <div className="confirmation-popup">
          <div className="confirmation-content">
            <h3>Confirm Rejection</h3>
            <p>
              Are you sure you want to reject this user?
              <br />
              <strong>
                {user.name} {user.surname}
              </strong>{" "}
              from <strong>{user.companyname}</strong>
              <br />
              <br />
              This action will prevent the user from accessing the system.
            </p>
            <div className="confirmation-buttons">
              <button className="cancel-button" onClick={cancelReject}>
                Cancel
              </button>
              <button className="confirm-reject-button" onClick={confirmReject}>
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserDetailView
