"use client"

import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import "../css/ClientPayments.css"
import { source } from "framer-motion/client"

const DirectorUploadProof = () => {
  const navigate = useNavigate()
  const { companyName, balance } = useParams()
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [amount, setAmount] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!selectedFile || !amount) {
      alert("Please select a file and enter an amount")
      return
    }

    setIsSubmitting(true)

    // In a real app, you would upload the file to a server here
    // For this example, we'll just simulate a successful upload
    setTimeout(() => {
      // Navigate back to the client payments list with the uploaded proof info
      navigate("/client-payments", {
        state: {
          uploadedProof: {
            company: decodeURIComponent(companyName),
            proof: selectedFile,
            amount: amount,
            sourceDocDetails: "Source Doc Details",
            date: new Date().toLocaleDateString("en-ZA", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }), // Format: 1 January 2022   (en-ZA locale)      
          },
        },
      })
      setIsSubmitting(false)
    }, 1000) // Simulate a 1-second upload
  }

  const handleBack = () => {
    navigate("/DirectorClientPaymentList")
  }

  return (
    <div className="upload-container">
      <div className="header-actions">
        <button onClick={handleBack} className="back-button">
          Back
        </button>
      </div>

      <div className="upload-content" style={{marginTop:"-120px"}}>
        <div className="upload-form">
          <div className="amount-field">
            <label>Amount Paid</label>
            <input type="text" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="R0000" />
          </div>
          <div className="amount-field">
            <label>Payment Date</label>
            <input type="Date"  />
          </div>
          <div className="amount-field">
            <label>Source Doc Details</label>
            <input type="text" placeholder="Bank Statement" />
          </div>


          <button className="submit-button" onClick={handleSubmit} disabled={ !amount || isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Proof of Payment"}
          </button>
        </div>

        <div className="info-box">
        
        </div>
      </div>
    </div>
  )
}

export default DirectorUploadProof

