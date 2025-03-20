"use client"

import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import "../css/ClientPayments.css"

const ClientPaymentList = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const [clientPayments, setClientPayments] = useState([
    {
      company: "Company ABC",
      balance: "R20 000",
      latestDate: "26/08/2023",
      status: "Not Uploaded",
      proof: null,
    },
    {
      company: "Little Helpers LTD",
      balance: "R20 000",
      latestDate: "25/08/2023",
      status: "Uploaded",
      proof: "dummy_proof.png", // This is for illustration; it will be updated after file upload
    },
  ])

  // Check for uploaded proof when returning from upload page
  useEffect(() => {
    if (location.state && location.state.uploadedProof) {
      const { company, proof, amount } = location.state.uploadedProof
      updatePaymentStatus(company, proof, amount)
    }
  }, [location.state])

  const handleUpload = (company, balance) => {
    navigate(`/upload/${encodeURIComponent(company)}/${encodeURIComponent(balance)}`)
  }

  const handleBack = () => {
    navigate("/debtors")
  }

  const handleViewProof = (company) => {
    const payment = clientPayments.find((payment) => payment.company === company)
    if (payment && payment.proof) {
      // Open a modal or dialog to show the image
      openImageViewer(payment.proof, payment.company)
    } else {
      alert("No proof of payment uploaded")
    }
  }

  const updatePaymentStatus = (company, proof, amount) => {
    setClientPayments((prevPayments) =>
      prevPayments.map((payment) =>
        payment.company === company ? { ...payment, status: "Uploaded", proof, amount } : payment,
      ),
    )
  }

  // Function to open image viewer
  const openImageViewer = (imageUrl, company) => {
    // Create a modal to display the image
    const modal = document.createElement("div")
    modal.className = "proof-modal"

    const modalContent = document.createElement("div")
    modalContent.className = "proof-modal-content"

    const closeBtn = document.createElement("span")
    closeBtn.className = "proof-modal-close"
    closeBtn.innerHTML = "&times;"
    closeBtn.onclick = () => document.body.removeChild(modal)

    const title = document.createElement("h2")
    title.textContent = `Proof of Payment - ${company}`

    const img = document.createElement("img")
    img.src = imageUrl instanceof File ? URL.createObjectURL(imageUrl) : imageUrl
    img.className = "proof-image"

    modalContent.appendChild(closeBtn)
    modalContent.appendChild(title)
    modalContent.appendChild(img)
    modal.appendChild(modalContent)

    document.body.appendChild(modal)

    // Clean up object URL when modal is closed
    if (imageUrl instanceof File) {
      modal.addEventListener("remove", () => URL.revokeObjectURL(img.src))
    }
  }

  return (
    <div className="client-payment-container">
      <div className="header-actions">
        <button onClick={handleBack} className="back-button">
          Back
        </button>
      </div>
      <div className="payment-table">
        <div className="table-header">
          <div className="header-cell">Company</div>
          <div className="header-cell">Balance</div>
          <div className="header-cell">Latest date</div>
          <div className="header-cell">Status</div>
          <div className="header-cell">Proof of Payment</div>
        </div>
        {clientPayments.map((payment, index) => (
          <div key={index} className="table-row">
            <div className="table-cell">{payment.company}</div>
            <div className="table-cell">{payment.balance}</div>
            <div className="table-cell">{payment.latestDate}</div>
            <div className="table-cell">{payment.status}</div>
            <div className="table-cell">
              {payment.status === "Uploaded" ? (
                <button className="view-button" onClick={() => handleViewProof(payment.company)}>
                  View
                </button>
              ) : (
                <button className="upload-button" onClick={() => handleUpload(payment.company, payment.balance)}>
                  Upload
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ClientPaymentList

