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
      openImageViewer(payment.proof, payment.company)
    } else {
      alert("No proof of payment uploaded")
    }
  }

  const updatePaymentStatus = (company, proof, amount) => {
    setClientPayments((prevPayments) =>
      prevPayments.map((payment) =>
        payment.company === company ? { ...payment, status: "Uploaded", proof, amount } : payment
      )
    )
  }

  const openImageViewer = (imageUrl, company) => {
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
      <table className="payment-table1" >
        <thead>
          <tr>
            <th>Company</th>
            <th>Balance</th>
            <th>Latest Date</th>
            <th>Status</th>
            <th>Proof of Payment</th>
          </tr>
        </thead>
        <tbody>
          {clientPayments.map((payment, index) => (
            <tr key={index}>
              <td>{payment.company}</td>
              <td>{payment.balance}</td>
              <td>{payment.latestDate}</td>
              <td>{payment.status}</td>
              <td>
                {payment.status === "Uploaded" ? (
                  <button className="view-button" onClick={() => handleViewProof(payment.company)}>
                    View
                  </button>
                ) : (
                  <button className="upload-button" onClick={() => handleUpload(payment.company, payment.balance)}>
                    Upload
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ClientPaymentList
