"use client"

import { useState } from "react"
import { useNavigate, useLocation, useParams } from "react-router-dom"
import axios from "axios"
import "../css/ClientPayments.css"

const UploadProof = () => {
  const navigate = useNavigate()
  const { clientName } = useParams()
  const location = useLocation()
  const { clientId } = location.state || {}

  const [amount, setAmount] = useState("")
  const [paymentDate, setPaymentDate] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!clientId) {
      setError("No client selected")
      return
    }

    if (!amount || isNaN(amount)) {
      setError("Please enter a valid amount")
      return
    }

    if (!paymentDate) {
      setError("Please select a payment date")
      return
    }

    try {
      setIsSubmitting(true)
      const response = await axios.post(
        `http://localhost:5000/api/payments/${clientId}/upload`,
        {
          amount: parseFloat(amount),
          fileupload: paymentDate,
        },
        {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (response.data.success) {
        navigate(`/client-payments`, {
          state: { clientId, clientName },
        })
      } else {
        throw new Error(response.data.message || "Failed to upload payment details")
      }
    } catch (err) {
      console.error("Error uploading payment details:", err)
      setError(err.message || "An error occurred while uploading the payment details")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    navigate(`/client-payments`, {
      state: { clientId, clientName },
    })
  }

  return (
    <div className="upload-container">
      <div className="header-actions">
        <button onClick={handleBack} className="back-button">
          Back
        </button>
      </div>

      <div className="upload-content" style={{ marginTop: "-120px" }}>
        <div className="upload-form">
          <h2>Upload Payment for {clientName}</h2>
          {error && <div className="error-message" style={{ color: "red", marginBottom: "10px" }}>{error}</div>}
          <div className="amount-field">
            <label>Amount Paid</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="amount-field">
            <label>Payment Date</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>
          <button
            className="submit-button"
            onClick={handleSubmit}
            disabled={!amount || !paymentDate || isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Payment Details"}
          </button>
        </div>

        <div className="info-box"></div>
      </div>
    </div>
  )
}

export default UploadProof