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
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitMessage("")

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
      // Create FormData object to handle file upload
      const formDataToSend = new FormData()

      // Add data to FormData
      formDataToSend.append("documentFrom", formData.documentFrom)
      formDataToSend.append("expenseCost", formData.expenseCost)
      formDataToSend.append("truckId", truckId)

      // Only add driverId if documentFrom is "Driver"
      if (formData.documentFrom === "Driver" && formData.driverName) {
        formDataToSend.append("driverId", formData.driverName)
      }

      // Add file
      formDataToSend.append("slip", file)

      // Send data to server
      const response = await fetch("http://localhost:5000/expenses", {
        method: "POST",
        body: formDataToSend,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to submit expense")
      }

      const result = await response.json()
      console.log("Submission successful:", result)
      setSubmitMessage("Expense submitted successfully!")

      // Reset form after successful submission
      setFormData({
        documentFrom: "Controller",
        expenseCost: "",
        driverName: "",
        driverFullName: "",
      })
      setFile(null)

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
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setFile(null)
  }

  return (
    <div className="expenses-container">
      <div className="client-payments-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          Back
        </button>
        {truckRegNum && <h2>Add Fuel Expense for {truckRegNum}</h2>}
      </div>

      <form onSubmit={handleSubmit} className="submission-form">
        <div className="form-row">
          <div className="form-group">
            <label>Document From</label>
            <select name="documentFrom" value={formData.documentFrom} onChange={handleInputChange} className="dropdown">
              <option value="Controller">Controller</option>
              <option value="Driver">Driver</option>
              <option value="Manager">Manager</option>
            </select>
          </div>

          <div className="form-group">
            <label>Expense Cost</label>
            <div className="form-input" style={{ display: "flex", alignItems: "center" }}>
              <span style={{ marginRight: "2px" }}>R</span>
              <input
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
                style={{ border: "none", outline: "none",width: "calc(100% - 20px)", height:"30px "}}
                placeholder="0.00"ew
              />
            </div>
          </div>
        </div>

        <div className="form-row">
          {formData.documentFrom === "Driver" && (
            <div className="form-group" style={{ width: "100%" }}>
              <label>Driver Name</label>
              <Select
                options={driverOptions}
                onChange={handleDriverChange}
                isSearchable
                className="form-input"
                placeholder="Select a driver"
              />
              {formData.driverFullName && (
                <div className="selected-driver-info" style={{ marginTop: "5px", fontSize: "14px", color: "#666" }}>
                  <p>Selected driver: {formData.driverFullName}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="file-upload-container">
          <div className="file-upload-header">
            <h3>Petrol Slip Submission</h3>
            <button type="button" className="close-button" onClick={handleCancel}>
              ×
            </button>
          </div>

          <div className="file-upload-area">
            <div className="drop-zone">
              <div className="upload-icon">📁</div>
              <p>Drop files here</p>
              <p className="file-format">Supported format: PNG, JPG</p>

              <div className="or-divider">OR</div>

              <div className="browse-files">
                <label htmlFor="file-upload" className="browse-button">
                  Browse files
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </div>

              {file && (
                <div className="selected-file">
                  <p>Selected file: {file.name}</p>
                </div>
              )}
            </div>
          </div>

          <div className="file-upload-actions">
            <button type="button" className="cancel-button" onClick={handleCancel}>
              Cancel
            </button>
            <button
              type="button"
              className="upload-button"
              onClick={() => document.getElementById("file-upload").click()}
            >
              Select File
            </button>
          </div>
        </div>

        {submitMessage && (
          <div className={`submit-message ${submitMessage.includes("Error") ? "error" : "success"}`}>
            {submitMessage}
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="submit-button" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ExpenseSubmission

