"use client"

import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import "../finance clerkpages/css/UploadInstructionDocuments.css"

const UploadInstructionDocuments = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const clientId = location.state?.clientId
  const instructionId = location.state?.instructionId

  const [documents, setDocuments] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [docName, setDocName] = useState("")
  const [docType, setDocType] = useState("Instruction Document")
  const [loading, setLoading] = useState(false)
  const [legs, setLegs] = useState([])
  const [currentLeg, setCurrentLeg] = useState(null)

  useEffect(() => {
    if (instructionId) {
      fetchLegs()
      fetchDocuments()
    }
  }, [instructionId])

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
      }
    } catch (error) {
      console.error("Error fetching legs:", error)
    }
  }

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`http://localhost:5000/documents/${instructionId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch documents")
      }
      const data = await response.json()
      setDocuments(data)
    } catch (error) {
      console.error("Error fetching documents:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (index) => {
    try {
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
    } catch (error) {
      console.error("Error removing document:", error)
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!selectedFile || !docName || !currentLeg) {
      alert("Please select a file, enter a document name, and select a leg")
      return
    }

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("name", docName)
      formData.append("type", docType)
      formData.append("instructionId", instructionId)
      formData.append("legNumber", currentLeg)

      const response = await fetch("http://localhost:5000/documents/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload document")
      }

      const result = await response.json()

      const newDocument = {
        id: result.id,
        name: docName,
        type: docType,
        date: new Date().toLocaleDateString("en-GB"),
        legNumber: currentLeg,
        file: selectedFile,
      }

      setDocuments([...documents, newDocument])
      setDocName("")
      setSelectedFile(null)
      document.getElementById("fileInput").value = ""

      // Refresh documents list
      fetchDocuments()
    } catch (error) {
      console.error("Error uploading document:", error)
      alert("Failed to upload document: " + error.message)
    }
  }

  const handleCancel = () => {
    setDocName("")
    setSelectedFile(null)
    document.getElementById("fileInput").value = ""
  }

  const handleBackClick = () => {
    if (instructionId) {
      navigate("/update-instructions", { state: { clientId, instructionId } })
    } else {
      navigate("/instructions", { state: { clientId } })
    }
  }

  const handleFinish = async () => {
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

      alert("Instruction completed successfully!")
      navigate("/instructions", { state: { clientId } })
    } catch (error) {
      console.error("Error completing instruction:", error)
      alert("Failed to complete instruction: " + error.message)
    }
  }

  return (
    <div className="instruction-container">
      <div className="">
        <button className="back-button" onClick={handleBackClick}>
          Back
        </button>
      </div>

      <div className="steps">
        {legs.map((leg) => (
          <button
            key={leg.legkey}
            className={`step-btn ${currentLeg === leg.legnumber ? "bg-green-500 text-white" : ""}`}
            onClick={() => setCurrentLeg(leg.legnumber)}
          >
            Leg {leg.legnumber}
          </button>
        ))}
        <button className="step-btn document-btn">Document</button>
      </div>

      <div className="upload-section">
        <h3>Documentation for Instruction/Instruction Completion</h3>
        <div className="upload-box">
          <p>{selectedFile ? selectedFile.name : "Drop files here"}</p>
          <p>
            Supported format: PNG, JPG OR{" "}
            <span className="browse-link" onClick={() => document.getElementById("fileInput").click()}>
              Browse files
            </span>
          </p>
          <input
            type="file"
            id="fileInput"
            style={{ display: "none" }}
            onChange={(e) => setSelectedFile(e.target.files[0])}
          />
        </div>

        <div className="form">
          <input type="text" placeholder="Document Name" value={docName} onChange={(e) => setDocName(e.target.value)} />
          <select value={docType} onChange={(e) => setDocType(e.target.value)} placeholder="Document type">
            <option>Instruction Document</option>
            <option>Delivery Note</option>
            <option>Empty Turning Depot Document</option>
          </select>
          <div className="form-actions">
            <button className="cancel-btn" onClick={handleCancel}>
              Cancel
            </button>
            <button className="upload-btn" onClick={handleUpload}>
              Upload
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        {loading ? (
          <p>Loading documents...</p>
        ) : (
          <table className="document-table" style={{ textAlign: "center" }}>
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Document Type</th>
                <th>Leg</th>
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
                    <td>{doc.legNumber || "N/A"}</td>
                    <td>{doc.date}</td>
                    <td>
                      <button onClick={() => handleRemove(index)} className="remove-btn">
                        Remove
                      </button>
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

      <button className="finish-btn" onClick={handleFinish}>
        Finish Instruction
      </button>
    </div>
  )
}

export default UploadInstructionDocuments

