"use client"
import { useState, useEffect } from "react"
import Select from "react-select"
import { useNavigate, useLocation } from "react-router-dom"
import "../finance clerkpages/css/Expenses1.css"

const ExpenseSubmission = ({ onBack }) => {
  const navigate = useNavigate()
  const location = useLocation()

  // Get truck information from location state
  const truckId = location.state?.truckId
  const truckRegNum = location.state?.truckRegNum

  const [formData, setFormData] = useState({
    documentFrom: "Controller",
    expenseCost: "500",
    driverName: "",
    driverFullName: "",
  })

  const [file, setFile] = useState(null)
  const [driverOptions, setDriverOptions] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState("")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [filePreview, setFilePreview] = useState(null)

  // Redirect if no truck ID is provided
  useEffect(() => {
    if (!truckId) {
      console.warn("No truck ID provided, redirecting to truck selection")
      setSubmitMessage("Error: No truck selected. Redirecting...")

      setTimeout(() => {
        navigate("/ViewExpense")
      }, 2000)
    }
  }, [truckId, navigate])

  useEffect(() => {
    // Fetch drivers
    const fetchDrivers = async () => {
      try {
        const response = await fetch("http://localhost:5000/employees/drivers")
        if (!response.ok) {
          throw new Error("Failed to fetch drivers")
        }
        const data = await response.json()
        console.log("Drivers from backend:", data)
        const options = data.map((driver) => ({
          value: driver.userid,
          label: `${driver.name} ${driver.surname}`,
          fullName: `${driver.name} ${driver.surname}`,
        }))
        setDriverOptions(options)
      } catch (error) {
        console.error("Error fetching drivers:", error)
      }
    }

    fetchDrivers()
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })

    // Reset driver selection if document from is changed
    if (name === "documentFrom" && value !== "Driver") {
      setFormData((prev) => ({
        ...prev,
        driverName: "",
        driverFullName: "",
      }))
    }
  }

  const handleDriverChange = (selectedOption) => {
    setFormData({
      ...formData,
      driverName: selectedOption ? selectedOption.value : "",
      driverFullName: selectedOption ? selectedOption.fullName : "",
    })
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitMessage("")
    setUploadProgress(0)

    // Validate truck ID
    if (!truckId) {
      setSubmitMessage("Error: No truck selected")
      setIsSubmitting(false)
      return
    }

    // Validate driver selection if "Driver" is selected
    if (formData.documentFrom === "Driver" && !formData.driverName) {
      setSubmitMessage("Error: Please select a driver")
      setIsSubmitting(false)
      return
    }

    // Validate file upload
    if (!file) {
      setSubmitMessage("Error: Please upload a petrol slip")
      setIsSubmitting(false)
      return
    }

    try {
      // Create FormData object for the server request
      const formDataToSend = new FormData()

      // Add data to FormData
      formDataToSend.append("documentFrom", formData.documentFrom)
      formDataToSend.append("expenseCost", formData.expenseCost)
      formDataToSend.append("truckId", truckId)
      formDataToSend.append("slip", file) // Add the file

      // Only add driverId if documentFrom is "Driver"
      if (formData.documentFrom === "Driver" && formData.driverName) {
        formDataToSend.append("driverId", formData.driverName)
      }

      // Simulate upload progress
      setUploadProgress(10)
      setTimeout(() => setUploadProgress(30), 300)
      setTimeout(() => setUploadProgress(50), 600)

      // Send data to server - this will now use the S3 upload middleware
      console.log("Sending expense data to server with S3 upload...")
      try {
        const response = await fetch("http://localhost:5000/expenses", {
          method: "POST",
          body: formDataToSend,
        })

        // Check if the response is JSON
        const contentType = response.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error(`Server returned non-JSON response: ${await response.text()}`)
        }

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.message || "Failed to submit expense")
        }

        setUploadProgress(100)
        console.log("Submission successful:", result)

        // Check if there's a warning about slipurl column
        if (result.data && result.data.warning) {
          setSubmitMessage(`Expense submitted successfully! Note: ${result.data.warning}`)
        } else {
          setSubmitMessage("Expense submitted successfully!")
        }

        // Reset form after successful submission
        setFormData({
          documentFrom: "Controller",
          expenseCost: "",
          driverName: "",
          driverFullName: "",
        })
        setFile(null)
        setFilePreview(null)

        // Navigate back to expense details for this truck after a short delay
        setTimeout(() => {
          if (onBack) {
            onBack()
          } else {
            navigate(`/ExpenseDetails/${truckId}`, {
              state: {
                truckId: truckId,
                truckRegNum: truckRegNum,
              },
            })
          }
        }, 2000)
      } catch (error) {
        console.error("Error submitting expense:", error)
        setSubmitMessage(`Error: ${error.message}`)
        setUploadProgress(0)
      }
    } catch (error) {
      console.error("Error submitting expense:", error)
      setSubmitMessage(`Error: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setFile(null)
    setFilePreview(null)
  }

  return (
    <div className="expenses-container">
      <div className="client-payments-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>

      {/* Simple centered title */}
      <h2 className="expense-title" >{truckRegNum && `Add Fuel Expense for ${truckRegNum}`}</h2>

      <form onSubmit={handleSubmit} className="expense-form">
        <div className="form-card">
          {/* Basic expense details */}
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="documentFrom">Document From</label>
              <select id="documentFrom" name="documentFrom" value={formData.documentFrom} onChange={handleInputChange} className="dropdown">
                <option value="Controller">Controller</option>
                <option value="Driver">Driver</option>
                <option value="Manager">Manager</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="expenseCost">Expense Cost</label>
              <div className="currency-field">
                <span>R</span>
                <input
                  id="expenseCost"
                  type="text"
                  name="expenseCost"
                  value={formData.expenseCost.replace(/^R/, "")}
                  onChange={(e) => {
                    // Only allow numbers and decimal point
                    const value = e.target.value.replace(/[^0-9.]/g, "")
                    setFormData({
                      ...formData,
                      expenseCost: value,
                    })
                  }}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Driver selection (conditional) */}
          {formData.documentFrom === "Driver" && (
            <div className="form-field driver-field">
              {/* <label htmlFor="driverSelect">Driver Name</label> */}
              <Select
                inputId="driverSelect"
                options={driverOptions}
                onChange={handleDriverChange}
                isSearchable
                placeholder="Select a driver"
                className="driver-select"
                classNamePrefix="driver-select"
              />
              {formData.driverFullName && <div className="driver-info">Selected: {formData.driverFullName}</div>}
            </div>
          )}

          {/* File upload section */}
          <div className="upload-section">
            <label>Petrol Slip</label>

            {!file ? (
              <div className="upload-area" onClick={() => document.getElementById("file-upload").click()}>
                <div className="upload-content">
                  <svg className="upload-icon" viewBox="0 0 24 24">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                  </svg>
                  <div className="upload-text">
                    <p>Click to upload or drag and drop</p>
                    <p className="upload-hint">PNG, JPG or PDF (max 10MB)</p>
                  </div>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </div>
            ) : (
              <div className="file-preview-box">
                <div className="file-info">
                  {file.type.startsWith("image/") ? (
                    <svg className="file-type-icon" viewBox="0 0 24 24">
                      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                    </svg>
                  ) : (
                    <svg className="file-type-icon" viewBox="0 0 24 24">
                      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                    </svg>
                  )}
                  <div className="file-details">
                    <div className="file-name">{file.name}</div>
                    <div className="file-size">{(file.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <button type="button" className="remove-file" onClick={handleCancel}>
                    <svg viewBox="0 0 24 24">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                  </button>
                </div>

                {filePreview && (
                  <div className="image-preview">
                    <img src={filePreview || "/placeholder.svg"} alt="Preview" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Progress and messages */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          )}

          {submitMessage && (
            <div className={`message ${submitMessage.includes("Error") ? "error" : "success"}`}>{submitMessage}</div>
          )}

          {/* Form actions */}
          <div className="form-actions">
            {/* <button type="button" className="cancel-button" onClick={() => navigate(-1)}>
              Cancel
            </button> */}
            <button type="submit" className="submit-button" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default ExpenseSubmission
