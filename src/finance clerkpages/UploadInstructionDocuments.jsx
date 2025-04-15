"use client"

import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import "../finance clerkpages/css/UploadInstructionDocuments.css"

const UploadInstructionDocuments = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const clientId = location.state?.clientId
  const instructionId = location.state?.instructionId
  const [isCompleted, setIsCompleted] = useState(false)

  const [documents, setDocuments] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [docName, setDocName] = useState("")
  const [docType, setDocType] = useState("Instruction Document")
  const [legNumber, setLegNumber] = useState("")
  const [loading, setLoading] = useState(false)
  const [legs, setLegs] = useState([])
  const [currentLeg, setCurrentLeg] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [submitMessage, setSubmitMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(isCompleted)
  const [shipmentType, setShipmentType] = useState(null)
  const [debugInfo, setDebugInfo] = useState({})
  const [containerCount, setContainerCount] = useState(0)
  const [isDocumentPage, setIsDocumentPage] = useState(true)

  // Add state for modals
  const [showFinishConfirmModal, setShowFinishConfirmModal] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showRemoveConfirmModal, setShowRemoveConfirmModal] = useState(false)
  const [documentToRemove, setDocumentToRemove] = useState({ index: null, name: "" })

  useEffect(() => {
    if (instructionId) {
      fetchLegs()
      fetchDocuments()
      fetchInstructionStatus()
      fetchContainers() // Add this line to fetch containers

      // Check if shipmentType was passed in location state
      if (location.state?.shipmentType !== undefined) {
        console.log("Using shipmentType from location state:", location.state.shipmentType)
        const shipmentTypeValue = Number(location.state.shipmentType)
        setShipmentType(shipmentTypeValue)
        setDebugInfo((prev) => ({
          ...prev,
          shipmentTypeFromState: location.state.shipmentType,
          shipmentTypeValueFromState: shipmentTypeValue,
        }))
      } else {
        // Otherwise fetch it
        fetchShipmentType()
      }
    }
  }, [instructionId])

  const fetchContainers = async () => {
    try {
      const response = await fetch(`http://localhost:5000/containers/instruction/${instructionId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch containers")
      }
      const data = await response.json()
      console.log("Containers for instruction:", data)
      setContainerCount(data.length)
    } catch (error) {
      console.error("Error fetching containers:", error)
      setContainerCount(0)
    }
  }

  const fetchShipmentType = async () => {
    try {
      console.log("Fetching shipment type for instruction ID:", instructionId)
      const response = await fetch(`http://localhost:5000/instructions/${instructionId}/shipment-type`)
      if (!response.ok) {
        throw new Error("Failed to fetch shipment type")
      }
      const data = await response.json()
      console.log("Shipment type API response:", data)

      // Ensure shipment_type is treated as a number
      const shipmentTypeValue = Number(data.shipment_type)
      console.log("Setting shipment type to:", shipmentTypeValue)

      setShipmentType(shipmentTypeValue)
      setDebugInfo((prev) => ({
        ...prev,
        shipmentTypeFromAPI: data.shipment_type,
        shipmentTypeValueFromAPI: shipmentTypeValue,
      }))
    } catch (error) {
      console.error("Error fetching shipment type:", error)
      setDebugInfo((prev) => ({
        ...prev,
        shipmentTypeError: error.message,
      }))
    }
  }

  // Update the fetchInstructionStatus function to check location state first
  const fetchInstructionStatus = async () => {
    // First check if isCompleted was passed in the location state
    if (location.state?.isCompleted !== undefined) {
      setIsCompleted(location.state.isCompleted)
      return
    }

    // Otherwise fetch from API
    try {
      const response = await fetch(`http://localhost:5000/instructions/${instructionId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch instruction")
      }
      const data = await response.json()
      setIsCompleted(data.status === "Completed" || data.is_completed)
    } catch (error) {
      console.error("Error fetching instruction:", error)
    }
  }

  const fetchLegs = async () => {
    try {
      const response = await fetch(`http://localhost:5000/legs/${instructionId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch legs")
      }
      const data = await response.json()
      setLegs(data)

      // Set the first leg as current if available
      if (data.length > 0 && !currentLeg) {
        setCurrentLeg(data[0].legnumber)
        setLegNumber(data[0].legnumber)
      }
    } catch (error) {
      console.error("Error fetching legs:", error)
    }
  }

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      console.log("Fetching documents for instruction ID:", instructionId)
      const response = await fetch(`http://localhost:5000/documents/${instructionId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.status} ${response.statusText}`)
      }
      const data = await response.json()
      console.log("Fetched documents:", data)
      setDocuments(data)
    } catch (error) {
      console.error("Error fetching documents:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLegClick = (legNumber) => {
    // Find the index of the leg with this number
    const legIndex = legs.findIndex((leg) => leg.legnumber === legNumber)

    if (legIndex === -1) {
      console.error(`Could not find leg with number ${legNumber}`)
      return
    }

    console.log(`Navigating to leg index ${legIndex}`)

    // Force a clean navigation by using a unique timestamp in the state
    navigate("/update-instructions", {
      state: {
        clientId,
        instructionId,
        selectedLegIndex: legIndex,
        timestamp: Date.now(), // Add a timestamp to force React to see this as new state
      },
      replace: true,
    })
    setIsDocumentPage(false)
  }

  const validateDocumentUpload = () => {
    // Check if file and document name are provided
    if (!selectedFile || !docName) {
      setSubmitMessage("Error: Please select a file and enter a document name")
      return false
    }

    // Validate file type
    const allowedFileTypes = /\.(jpg|jpeg|png|pdf)$/i
    if (!allowedFileTypes.test(selectedFile.name)) {
      setSubmitMessage("Error: Only JPG, PNG, and PDF files are allowed")
      return false
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB in bytes
    if (selectedFile.size > maxSize) {
      setSubmitMessage("Error: File size exceeds 10MB limit")
      return false
    }

    // For Instruction Document type
    if (docType === "Instruction Document") {
      // Check if we already have an instruction document
      const instructionDocs = documents.filter((doc) => doc.type === "Instruction Document")
      if (instructionDocs.length >= 1) {
        setSubmitMessage("Error: Only 1 Instruction Document is allowed")
        return false
      }
      // No leg number needed for instruction document
      return true
    }

    // For Delivery Note type
    if (docType === "Delivery Note") {
      // Check if leg number is provided
      // if (!legNumber) {
      //   setSubmitMessage("Error: Please select a leg number for the Delivery Note")
      //   return false
      // }

      // // Check if leg number is valid
      // if (!legs.some((leg) => leg.legnumber.toString() === legNumber.toString())) {
      //   setSubmitMessage(`Error: Leg ${legNumber} does not exist`)
      //   return false
      // }

      // Check if we already have a delivery note for this leg
      const legDeliveryNotes = documents.filter((doc) => doc.type === "Delivery Note")

      if (legDeliveryNotes.length >= containerCount) {
        setSubmitMessage(`Error: Too many delivery notes`)
        return false
      }

      return true
    }

    // For Empty Turning Depot Document
    if (docType === "Empty Turning Depot Document") {
      // Check if leg number is provided
      if (!legNumber) {
        setSubmitMessage("Error: Please select a leg number for the Empty Turning Depot Document")
        return false
      }

      // Check if leg number is valid
      if (!legs.some((leg) => leg.legnumber.toString() === legNumber.toString())) {
        setSubmitMessage(`Error: Leg ${legNumber} does not exist`)
        return false
      }

      // Check if we already have an Empty Turning Depot Document
      const emptyTurningDocs = documents.filter((doc) => doc.type === "Empty Turning Depot Document")
      if (emptyTurningDocs.length >= 1) {
        setSubmitMessage("Error: Only 1 Empty Turning Depot Document is allowed")
        return false
      }

      return true
    }

    return true
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setSelectedFile(selectedFile)

      // Generate a preview of the selected image
      if (selectedFile.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (event) => {
          setFilePreview(event.target.result)
        }
        reader.readAsDataURL(selectedFile)
      } else {
        // For non-image files like PDFs
        setFilePreview(null)
      }
    }
  }

  const handleRemove = async (index) => {
    const docToRemove = documents[index]
    setDocumentToRemove({ index, name: docToRemove.name })
    setShowRemoveConfirmModal(true)
  }

  const confirmRemove = async () => {
    try {
      const index = documentToRemove.index
      const docToRemove = documents[index]

      if (docToRemove.id) {
        const response = await fetch(`http://localhost:5000/documents/${docToRemove.id}`, {
          method: "DELETE",
        })

        if (!response.ok) {
          throw new Error("Failed to delete document")
        }
      }

      const newDocs = [...documents]
      newDocs.splice(index, 1)
      setDocuments(newDocs)
      setShowRemoveConfirmModal(false)
    } catch (error) {
      console.error("Error removing document:", error)
      setShowRemoveConfirmModal(false)
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()

    // Reset message and set submitting state
    setSubmitMessage("")
    setIsSubmitting(true)
    setUploadProgress(0)

    // Validate the document upload
    if (!validateDocumentUpload()) {
      setIsSubmitting(false)
      return
    }
    let progressInterval;
    try {
      // Create FormData object for the server request
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("name", docName)
      formData.append("type", docType)
      formData.append("instructionId", instructionId)

      // Only append leg number for delivery notes and depot documents
      if (docType !== "Instruction Document") {
        formData.append("legNumber", legNumber)
      } else {
        // For instruction documents, use leg 1 by default
        formData.append("legNumber", "1")
      }

      // Simulate upload progress
      // setUploadProgress(10)
      // setTimeout(() => setUploadProgress(30), 300)
      // setTimeout(() => setUploadProgress(50), 600)
      const simulateProgress = () => {
        let progress = 0
        const interval = setInterval(() => {
          progress += 5
          if (progress >= 90) {
            clearInterval(interval)
          } else {
            setUploadProgress(progress)
          }
        }, 200)

        // Store the interval ID to clear it when upload completes or fails
        return interval
      }

      const progressInterval = simulateProgress()


      console.log("Sending document upload request with data:", {
        name: docName,
        type: docType,
        instructionId,
        legNumber: docType !== "Instruction Document" ? legNumber : "1",
      })

      // Send data to server
      const response = await fetch("http://localhost:5000/documents/upload", {
        method: "POST",
        body: formData,
      })

      // Check if the response is JSON
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const responseText = await response.text()
        throw new Error(`Server returned non-JSON response: ${responseText}`)
      }

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || "Failed to upload document")
      }

      // setUploadProgress(100)
      clearInterval(progressInterval)
      setUploadProgress(100)
      console.log("Upload successful:", result)

      // Create new document object
      const newDocument = {
        id: result.id,
        name: docName,
        type: docType,
        date: new Date().toLocaleDateString("en-GB"),
        legNumber: docType !== "Instruction Document" ? legNumber : "1",
        url: result.url,
      }

      // Add to documents list
      setDocuments([...documents, newDocument])

      // Reset form
      setDocName("")
      setSelectedFile(null)
      setFilePreview(null)
      if (document.getElementById("fileInput")) {
        document.getElementById("fileInput").value = ""
      }

      setSubmitMessage("Document uploaded successfully!")

      // Refresh documents list
      fetchDocuments()
    } catch (error) {
      console.error("Error uploading document:", error)
      setSubmitMessage(`Error: ${error.message}`)
      // setUploadProgress(0)
      clearInterval(progressInterval)
      setUploadProgress(0)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setDocName("")
    setSelectedFile(null)
    setFilePreview(null)
    if (document.getElementById("fileInput")) {
      document.getElementById("fileInput").value = ""
    }
  }

  const handleBackClick = () => {
    // Force a clean navigation
    navigate("/update-instructions", {
      state: {
        clientId,
        instructionId,
        timestamp: Date.now(), // Add a timestamp to force React to see this as new state
      },
      replace: true,
    })
  }

  // Modified to show confirmation modal instead of directly completing
  const handleFinish = () => {
    // Check if we have all required documents
    const instructionDocs = documents.filter((doc) => doc.type === "Instruction Document")
    const deliveryNotes = documents.filter((doc) => doc.type === "Delivery Note")

    if (instructionDocs.length !== 1) {
      setSubmitMessage("Error: Exactly 1 Instruction Document is required")
      return
    }

    if (deliveryNotes.length !== containerCount) {
      setSubmitMessage(`Error: Exactly ${containerCount} Delivery Notes are required (one per container)`)
      return
    }

    // Show confirmation modal
    setShowFinishConfirmModal(true)
  }

  // New function to actually complete the instruction after confirmation
  const completeInstruction = async () => {
    try {
      const response = await fetch(`http://localhost:5000/instructions/${instructionId}/complete`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "Completed" }),
      })

      if (!response.ok) {
        throw new Error("Failed to complete instruction")
      }
      const invoiceResponse = await fetch(`http://localhost:5000/generate-invoice/${instructionId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!invoiceResponse.ok) {
        const errorData = await invoiceResponse.json()
        console.error("Invoice generation failed:", errorData)
        // Still show success for instruction completion even if invoice fails
      } else {
        const invoiceData = await invoiceResponse.json()
        console.log("Invoice generated successfully:", invoiceData)
      }

      setShowSuccessPopup(true)

      setTimeout(() => {
        setShowSuccessPopup(false)
        navigate("/instructions", {
          state: { clientId },
          replace: true,
        })
      }, 2000)
    } catch (error) {
      console.error("Error completing instruction:", error)
      setSubmitMessage(`Error: ${error.message}`)
    } finally {
      // Close the confirmation modal
      setShowFinishConfirmModal(false)
    }
  }

  // Check if we can finish the instruction
  const canFinish = () => {
    const instructionDocs = documents.filter((doc) => doc.type === "Instruction Document")
    const deliveryNotes = documents.filter((doc) => doc.type === "Delivery Note")
    const emptyTurningDocs = documents.filter((doc) => doc.type === "Empty Turning Depot Document")

    // Basic requirements for all shipment types
    const basicRequirements = instructionDocs.length === 1 && deliveryNotes.length === containerCount

    // For Import shipments, also require an Empty Turning Depot Document
    if (showEmptyTurningDepotOption()) {
      return basicRequirements && emptyTurningDocs.length === 1
    }

    return basicRequirements
  }

  // Determine if we should show the Empty Turning Depot Document option
  const showEmptyTurningDepotOption = () => {
    console.log("Checking if we should show Empty Turning Depot Document option. Shipment type:", shipmentType)
    return shipmentType !== 2
  }

  return (
    <div className="instruction-container">
      <div>
        <button className="back-button" onClick={handleBackClick}>
          Back
        </button>
      </div>

      <div className="steps">
        {legs.map((leg) => (
          <button
            key={leg.legkey}
            className={`step-btn ${currentLeg === leg.legnumber && !isDocumentPage ? "active" : ""}`}
            onClick={() => handleLegClick(leg.legnumber)}
          >
            Leg {leg.legnumber}
          </button>
        ))}
        <button className="step-btn document-btn active" onClick={() => setIsDocumentPage(true)}>
          Document
        </button>
      </div>

      {!isCompleted ? (
        <div className="upload-card">
          <h3 className="document-title">Documentation for Instruction Completion</h3>

          <div className="upload-box" onClick={() => document.getElementById("fileInput").click()}>
            <div className="upload-content">
              <p>{selectedFile ? selectedFile.name : "Drop files here"}</p>
              <p>
                Supported formats: PNG, JPG, PDF OR <span className="browse-link">Browse files</span>
              </p>
              <input
                type="file"
                id="fileInput"
                style={{ display: "none" }}
                accept=".png,.jpg,.jpeg,.pdf"
                onChange={handleFileChange}
              />
            </div>

            {filePreview && (
              <div className="file-preview">
                <img src={filePreview || "/placeholder.svg"} alt="File Preview" />
              </div>
            )}
            {selectedFile && selectedFile.type === "application/pdf" && (
              <div className="file-preview">
                <p>PDF document selected</p>
              </div>
            )}
          </div>

          <div className="form">
            <input
              type="text"
              placeholder="Document Name"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
            />

            <select value={docType} onChange={(e) => setDocType(e.target.value)} className="dropdown">
              <option>Instruction Document</option>
              <option>Delivery Note</option>
              {/* Only show Empty Turning Depot Document for Import type (1) */}
              {showEmptyTurningDepotOption() && <option>Empty Turning Depot Document</option>}
            </select>

            {/* Only show leg selection for Delivery Notes and Empty Turning Depot Documents */}
            {/* {docType !== "Instruction Document" && (
              <select value={legNumber} onChange={(e) => setLegNumber(e.target.value)}>
                <option value="">Select Leg</option>
                {legs.map((leg) => (
                  <option key={leg.legkey} value={leg.legnumber}>
                    Leg {leg.legnumber}
                  </option>
                ))}
              </select>
            )} */}

            {submitMessage && (
              <div className={`submit-message ${submitMessage.includes("Error") ? "error" : "success"}`}>
                {submitMessage}
              </div>
            )}

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="upload-progress">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                </div>
                <div className="progress-text">Upload Progress: {uploadProgress}%</div>
              </div>
            )}

            <div className="form-actions">
              <button className="cancel-btn" onClick={handleCancel}>
                Cancel
              </button>
              <button className="upload-btn" onClick={handleUpload} disabled={isSubmitting}>
                {isSubmitting ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="view-only-section">
          <h3 className="document-title">Documentation for Instruction</h3>
        </div>
      )}

      <div className="document-table-container">
        {loading ? (
          <p>Loading documents...</p>
        ) : (
          <table className="document-table">
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Document Type</th>
                {/* <th>Leg</th> */}
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 ? (
                <tr>
                  <td colSpan="5">No documents found</td>
                </tr>
              ) : (
                documents.map((doc, index) => (
                  <tr key={index}>
                    <td>{doc.name}</td>
                    <td>{doc.type}</td>
                    {/* <td>{doc.type === "Instruction Document" ? "N/A" : doc.legNumber || "N/A"}</td> */}
                    <td>{doc.date}</td>
                    <td>
                      {!isCompleted && (
                        <button onClick={() => handleRemove(index)} className="remove-btn">
                          Remove
                        </button>
                      )}
                      <button className="view-btn" onClick={() => doc.url && window.open(doc.url)} disabled={!doc.url}>
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Document requirements status */}
      <div className="requirements-section">
        <h4>Document Requirements:</h4>
        <ul>
          <li
            style={{
              color: documents.filter((doc) => doc.type === "Instruction Document").length === 1 ? "green" : "red",
            }}
          >
            Instruction Document: {documents.filter((doc) => doc.type === "Instruction Document").length}/1
          </li>
          <li
            style={{
              color:
                documents.filter((doc) => doc.type === "Delivery Note").length === containerCount ? "green" : "red",
            }}
          >
            Delivery Notes: {documents.filter((doc) => doc.type === "Delivery Note").length}/{containerCount}
          </li>
          {showEmptyTurningDepotOption() && (
            <li
              style={{
                color:
                  documents.filter((doc) => doc.type === "Empty Turning Depot Document").length === 1 ? "green" : "red",
              }}
            >
              Empty Turning Depot Document:{" "}
              {documents.filter((doc) => doc.type === "Empty Turning Depot Document").length}/1
            </li>
          )}
        </ul>
      </div>

      <button
        className="finish-btn"
        onClick={handleFinish}
        disabled={!canFinish() || isCompleted}
        style={{
          opacity: canFinish() && !isCompleted ? 1 : 0.5,
          cursor: canFinish() && !isCompleted ? "pointer" : "not-allowed",
        }}
      >
        Finish Instruction
      </button>

      {/* Finish Confirmation Modal */}
      {showFinishConfirmModal && (
        <div className="modal-wrapper">
          <div className="modal-backdrop animate-fadeIn"></div>
          <div className="modal-container animate-scaleIn">
            <div className="modal-header">
              {/* <h3 className="modal-title">Complete Instruction</h3> */}
              <p className="modal-description">
                Are you sure you wish to complete instruction? Once completed, edit functionality will be unavailable.
              </p>
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn-secondary" onClick={() => setShowFinishConfirmModal(false)}>
                No
              </button>
              <button className="modal-btn modal-btn-primary" onClick={completeInstruction}>
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup && <div className="toast-popup">Instruction complete!</div>}

      {/* Remove Document Confirmation Modal */}
      {showRemoveConfirmModal && (
        <div className="modal-wrapper">
          <div className="modal-backdrop animate-fadeIn"></div>
          <div className="modal-container animate-scaleIn">
            <div className="modal-header">
              <p className="modal-description">Are you sure you want to remove this file?</p>
            </div>
            <div className="modal-body">
              <div className="p-2 text-center">
                <span className="text-gray-700">
                  File: <strong>{documentToRemove.name}</strong>
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn-secondary" onClick={() => setShowRemoveConfirmModal(false)}>
                No
              </button>
              <button className="modal-btn modal-btn-primary" onClick={confirmRemove}>
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UploadInstructionDocuments
