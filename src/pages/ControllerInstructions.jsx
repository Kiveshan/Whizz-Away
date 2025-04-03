"use client"

import { useState, useEffect, useRef } from "react"
import "../css/controllerinstruction.css"
import { useNavigate, useLocation } from "react-router-dom"
import ErrorModal from "../components/ErrorModal"
import API_CONFIG from "../utils/api-config"

const ControllerInstructions = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // Check if we have preserved form data from coming back
  const preservedFormData = location.state?.preservedFormData

  // API base URL from config
  const API_BASE_URL = API_CONFIG.BASE_URL

  // Create refs for each date input
  const pickupDateRef = useRef(null)
  const etaDateRef = useRef(null)
  const deadlineDateRef = useRef(null)

  // State to track if shipment type is import
  const [isImport, setIsImport] = useState(false)

  // State for form data - initialize with preserved data if available
  const [formData, setFormData] = useState(() => {
    if (preservedFormData) {
      return preservedFormData
    }

    return {
      clientId: "",
      representative: "",
      contactDetails: "",
      email: "",
      shipmentTypeId: "",
      shipmentTypeName: "",
      task: "",
      pickup: "",
      dropoff: "",
      hazardous: false,
      surcharges: false,
      pickupTime: "",
      pickupDate: "",
      stackDate: "",
      deadline: "",
      fileRef: "",
      rateWeight: "kg",
      rate: "",
      weight: "", // Add this new field
      num_six_meters: 0,
      num_twelve_meters: 0,
      num_abnormal: 0,
      vat: 15,
      description: "",
      total_cost: 0, // Add total_cost field
    }
  })

  // State for clients and shipment types
  const [clients, setClients] = useState([])
  const [shipmentTypes, setShipmentTypes] = useState([])
  const [isLoading, setIsLoading] = useState({
    clients: true,
    shipmentTypes: true,
  })

  // State for error modal
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    message: "",
  })

  // Function to open calendar
  const openCalendar = (ref) => {
    ref.current.click()
  }

  // Fetch clients and shipment types on component mount
  useEffect(() => {
    fetchClients()
    fetchShipmentTypes()
  }, [])

  // Fetch clients from API
  const fetchClients = async () => {
    setIsLoading((prev) => ({ ...prev, clients: true }))
    try {
      console.log("Fetching clients...")
      const response = await fetch(`${API_BASE_URL}/api/clients`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const text = await response.text()
        console.error("Response not OK:", text)
        throw new Error(`Failed to fetch clients: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log("Clients data received:", data.length, "records")
      setClients(data)
    } catch (error) {
      console.error("Error fetching clients:", error)
      setErrorModal({
        isOpen: true,
        message: "Failed to fetch clients. Please try again.",
      })
      setClients([])
    } finally {
      setIsLoading((prev) => ({ ...prev, clients: false }))
    }
  }

  // Fetch shipment types from API
  const fetchShipmentTypes = async () => {
    setIsLoading((prev) => ({ ...prev, shipmentTypes: true }))
    try {
      console.log("Fetching shipment types...")
      const response = await fetch(`${API_BASE_URL}/api/shipment-types`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const text = await response.text()
        console.error("Response not OK:", text)
        throw new Error(`Failed to fetch shipment types: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log("Shipment types data received:", data.length, "records")
      setShipmentTypes(data)
    } catch (error) {
      console.error("Error fetching shipment types:", error)
      setErrorModal({
        isOpen: true,
        message: "Failed to fetch shipment types. Please try again.",
      })
      setShipmentTypes([])
    } finally {
      setIsLoading((prev) => ({ ...prev, shipmentTypes: false }))
    }
  }

  // Handle client selection
  const handleClientChange = (e) => {
    const clientId = e.target.value
    const selectedClient = clients.find((client) => client.m5clientkey.toString() === clientId)

    if (selectedClient) {
      setFormData({
        ...formData,
        clientId,
        representative: selectedClient.representative || "",
        contactDetails: selectedClient.cellnum || "",
        email: selectedClient.email || "",
      })
    } else {
      setFormData({
        ...formData,
        clientId,
        representative: "",
        contactDetails: "",
        email: "",
      })
    }
  }

  // Handle shipment type selection
  const handleShipmentTypeChange = (e) => {
    const shipmentTypeId = e.target.value
    const selectedShipmentType = shipmentTypes.find((type) => type.shipkey.toString() === shipmentTypeId)

    const shipmentTypeName = selectedShipmentType ? selectedShipmentType.shipmenttype : ""
    const isImportType = shipmentTypeName.toLowerCase() === "import"

    setIsImport(isImportType)

    setFormData({
      ...formData,
      shipmentTypeId,
      shipmentTypeName,
    })
  }

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target

    if (type === "checkbox") {
      setFormData({
        ...formData,
        [name]: checked,
      })
    } else if (name === "num_six_meters" || name === "num_twelve_meters" || name === "num_abnormal") {
      // Ensure container counts are at least 0
      const numValue = Number.parseInt(value)
      const validValue = isNaN(numValue) || numValue < 0 ? 0 : numValue

      // Update the form data with the new container count
      const updatedFormData = {
        ...formData,
        [name]: validValue,
      }

      // If rate weight is "Container", recalculate total_cost
      if (formData.rateWeight === "Container") {
        const rate = Number.parseFloat(formData.rate)
        if (!isNaN(rate)) {
          // Calculate new total containers
          const totalContainers =
            (name === "num_six_meters" ? validValue : updatedFormData.num_six_meters) +
            (name === "num_twelve_meters" ? validValue : updatedFormData.num_twelve_meters) +
            (name === "num_abnormal" ? validValue : updatedFormData.num_abnormal)
          updatedFormData.total_cost = rate * totalContainers
        }
      }

      setFormData(updatedFormData)
    } else if (name === "rateWeight") {
      // Handle rate weight change
      const updatedFormData = {
        ...formData,
        [name]: value,
      }

      // If changing to "Container", set weight to null and recalculate total_cost
      if (value === "Container") {
        updatedFormData.weight = null

        const rate = Number.parseFloat(formData.rate)
        if (!isNaN(rate)) {
          const totalContainers = formData.num_six_meters + formData.num_twelve_meters + formData.num_abnormal
          updatedFormData.total_cost = rate * totalContainers
        }
      }
      // If changing from "Container" to kg or m³, reset total_cost until weight is entered
      else {
        updatedFormData.weight = ""
        updatedFormData.total_cost = 0
      }

      setFormData(updatedFormData)
    } else if (name === "rate" || name === "weight") {
      // Allow only numbers and decimal point
      if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
        const updatedFormData = {
          ...formData,
          [name]: value,
        }

        // Recalculate total_cost if both rate and required values are present
        const rate = name === "rate" ? Number.parseFloat(value) : Number.parseFloat(formData.rate)

        if (!isNaN(rate)) {
          if (formData.rateWeight === "Container") {
            const totalContainers = formData.num_six_meters + formData.num_twelve_meters + formData.num_abnormal
            updatedFormData.total_cost = rate * totalContainers
          } else if (
            (name === "weight" || formData.weight) &&
            (formData.rateWeight === "kg" || formData.rateWeight === "m³")
          ) {
            const weight = name === "weight" ? Number.parseFloat(value) : Number.parseFloat(formData.weight)
            if (!isNaN(weight)) {
              updatedFormData.total_cost = rate * weight
            }
          }
        }

        setFormData(updatedFormData)
      }
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })
    }
  }

  // Handle container count changes
  const handleContainerCountChange = (type, value) => {
    // Ensure value is a number and not negative
    const numValue = Number.parseInt(value)
    const validValue = isNaN(numValue) || numValue < 0 ? 0 : numValue

    // Update form data with new container count
    const updatedFormData = {
      ...formData,
      [type]: validValue,
    }

    // If rate weight is "Container", recalculate total_cost
    if (formData.rateWeight === "Container") {
      const rate = Number.parseFloat(formData.rate)
      if (!isNaN(rate)) {
        // Calculate new total containers
        const totalContainers =
          (type === "num_six_meters" ? validValue : updatedFormData.num_six_meters) +
          (type === "num_twelve_meters" ? validValue : updatedFormData.num_twelve_meters) +
          (type === "num_abnormal" ? validValue : updatedFormData.num_abnormal)
        updatedFormData.total_cost = rate * totalContainers
      }
    }

    setFormData(updatedFormData)
  }

  // Calculate total cost based on rate, weight, and container counts
  const calculateTotalCost = () => {
    const rate = Number.parseFloat(formData.rate)
    if (isNaN(rate)) return 0

    if (formData.rateWeight === "Container") {
      // For Container: rate × total_number_of_containers
      const totalContainers = formData.num_six_meters + formData.num_twelve_meters + formData.num_abnormal
      return rate * totalContainers
    } else {
      // For kg or m³: rate × weight_value
      const weight = Number.parseFloat(formData.weight)
      if (isNaN(weight)) return 0
      return rate * weight
    }
  }

  // Validate form
  const validateForm = () => {
    const requiredFields = [
      "clientId",
      "shipmentTypeId",
      "task",
      "pickup",
      "dropoff",
      "pickupTime",
      "pickupDate",
      "stackDate",
      "deadline",
      "fileRef",
      "rate",
      "description",
    ]

    for (const field of requiredFields) {
      if (!formData[field]) {
        setErrorModal({
          isOpen: true,
          message: `Please fill in all required fields. Missing: ${field.replace(/([A-Z])/g, " $1").toLowerCase()}`,
        })
        return false
      }
    }

    // Validate rate is a number
    if (isNaN(Number.parseFloat(formData.rate))) {
      setErrorModal({
        isOpen: true,
        message: "Rate must be a valid number",
      })
      return false
    }

    // Validate weight if kg or m³ is selected
    if ((formData.rateWeight === "kg" || formData.rateWeight === "m³") && !formData.weight) {
      setErrorModal({
        isOpen: true,
        message: `Please enter the weight in ${formData.rateWeight}`,
      })
      return false
    }

    // Validate weight is a number
    if (
      (formData.rateWeight === "kg" || formData.rateWeight === "m³") &&
      (formData.weight === "" || isNaN(Number.parseFloat(formData.weight)))
    ) {
      setErrorModal({
        isOpen: true,
        message: `Weight must be a valid number`,
      })
      return false
    }

    // Validate at least one container is added
    const totalContainers = formData.num_six_meters + formData.num_twelve_meters + formData.num_abnormal
    if (totalContainers <= 0) {
      setErrorModal({
        isOpen: true,
        message: "Please add at least one container",
      })
      return false
    }

    return true
  }

  // Handle form submission
  const handleSubmit = () => {
    if (!validateForm()) {
      return
    }

    // Calculate total containers
    const totalContainers = formData.num_six_meters + formData.num_twelve_meters + formData.num_abnormal

    // Calculate total cost
    const totalCost = calculateTotalCost()

    // Prepare weight value based on selection
    let weightValue = null
    if (formData.rateWeight === "kg" || formData.rateWeight === "m³") {
      weightValue = Number.parseFloat(formData.weight)
    }

    // Create updated form data with total_cost and weight
    const updatedFormData = {
      ...formData,
      total_cost: totalCost,
      weight: weightValue,
    }

    // Navigate to container details page with state
    navigate("/ControllerInstructionDetails", {
      state: {
        controllerData: updatedFormData,
        isImport: formData.shipmentTypeName.toLowerCase() === "import",
        totalContainers: totalContainers,
      },
    })
  }

  // Retry fetching data
  const handleRetryFetch = () => {
    if (isLoading.clients || isLoading.shipmentTypes) {
      return // Don't retry if already loading
    }

    fetchClients()
    fetchShipmentTypes()

    setErrorModal({
      isOpen: false,
      message: "",
    })
  }

  // Style for non-editable fields
  const nonEditableStyle = {
    backgroundColor: "#f0f0f0",
    cursor: "not-allowed",
  }

  return (
    <div>
      {/* Error Modal */}
      {errorModal.isOpen && (
        <ErrorModal
          isOpen={errorModal.isOpen}
          onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
          message={errorModal.message}
        />
      )}

      {/* Back Button */}
      <div className="client-payments-header">
        <button className="back-button" onClick={() => navigate("/ControllerDashboard")}>
          Back
        </button>
      </div>
      <div className="instruction-container1">
        <div className="content">
          {/* Loading indicator or retry button */}
          {isLoading.clients || isLoading.shipmentTypes ? (
            <div style={{ textAlign: "center", padding: "20px" }}>
              <p>Loading data...</p>
            </div>
          ) : clients.length === 0 || shipmentTypes.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px" }}>
              <p>Failed to load data from the database. Please try again.</p>
              <button
                onClick={handleRetryFetch}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#4a90e2",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  marginTop: "10px",
                }}
              >
                Retry
              </button>
            </div>
          ) : null}

          <div className="form-section">
            <div className="form-row1">
              <div className="form-group">
                <label>Client</label>
                <div className="select-wrapper">
                  <select
                    className="dropdown"
                    name="clientId"
                    value={formData.clientId}
                    onChange={handleClientChange}
                    disabled={isLoading.clients || clients.length === 0}
                  >
                    <option value="">Select Client</option>
                    {clients.map((client) => (
                      <option key={client.m5clientkey} value={client.m5clientkey}>
                        {client.companyname}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Representative</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Autoload representative"
                  name="representative"
                  value={formData.representative}
                  readOnly
                  style={nonEditableStyle}
                />
              </div>
              <div className="form-group">
                <label>Contact Details</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Autoload contact details"
                  name="contactDetails"
                  value={formData.contactDetails}
                  readOnly
                  style={nonEditableStyle}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="Autoload email"
                  name="email"
                  value={formData.email}
                  readOnly
                  style={nonEditableStyle}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-row1">
              <div className="form-group">
                <label>Shipment Type</label>
                <div className="select-wrapper">
                  <select
                    className="dropdown"
                    name="shipmentTypeId"
                    value={formData.shipmentTypeId}
                    onChange={handleShipmentTypeChange}
                    disabled={isLoading.shipmentTypes || shipmentTypes.length === 0}
                  >
                    <option value="">Select Shipment</option>
                    {shipmentTypes.map((type) => (
                      <option key={type.shipkey} value={type.shipkey}>
                        {type.shipmenttype}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Name of Task</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Input Name of Task"
                  name="task"
                  value={formData.task}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-row1">
              <div className="form-group">
                <label>Pick-Up Location</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Input pick-up location here"
                  name="pickup"
                  value={formData.pickup}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Drop-off</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Input drop-off location here"
                  name="dropoff"
                  value={formData.dropoff}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group checkboxes">
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="hazardous"
                    name="hazardous"
                    checked={formData.hazardous}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="hazardous">Hazardous Materials</label>
                </div>
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="surcharges"
                    name="surcharges"
                    checked={formData.surcharges}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="surcharges">Add Surcharges</label>
                </div>
              </div>
            </div>

            {/* Date Inputs with functional calendar buttons */}
            <div className="form-row1">
              <div className="form-group">
                <label>Pick-up Time</label>
                <div className="date-input-group">
                  <input
                    type="time"
                    className="form-input"
                    placeholder="Time here"
                    name="pickupTime"
                    value={formData.pickupTime}
                    onChange={handleInputChange}
                  />
                  <button className="calendar-button"></button>
                </div>
              </div>

              <div className="form-group">
                <label>Pick-up Date</label>
                <div className="date-input-group">
                  <input
                    type="date"
                    className="form-input"
                    ref={pickupDateRef}
                    placeholder="Date here"
                    name="pickupDate"
                    value={formData.pickupDate}
                    onChange={handleInputChange}
                  />
                  <button className="calendar-button" onClick={() => openCalendar(pickupDateRef)}></button>
                </div>
              </div>
              <div className="form-group">
                <label>{isImport ? "ETA" : "Stack Date"}</label>
                <div className="date-input-group">
                  <input
                    type="date"
                    className="form-input"
                    ref={etaDateRef}
                    placeholder="Date here"
                    name="stackDate"
                    value={formData.stackDate}
                    onChange={handleInputChange}
                  />
                  <button className="calendar-button" onClick={() => openCalendar(etaDateRef)}></button>
                </div>
              </div>
              <div className="form-group">
                <label>Deadline</label>
                <div className="date-input-group">
                  <input
                    type="date"
                    className="form-input"
                    ref={deadlineDateRef}
                    placeholder="Date here"
                    name="deadline"
                    value={formData.deadline}
                    onChange={handleInputChange}
                  />
                  <button className="calendar-button" onClick={() => openCalendar(deadlineDateRef)}></button>
                </div>
              </div>
            </div>
          </div>

          {/* Additional form sections */}
          <div className="form-section">
            <div className="form-row1">
              <div className="form-group">
                <label>File Ref</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Upload file number here"
                  style={{ width: "60%" }}
                  name="fileRef"
                  value={formData.fileRef}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group rates-group">
                <label>Rates per</label>
                <div className="rates-input-group">
                  <div className="select-wrapper small">
                    <select
                      className="dropdown"
                      style={{ width: "100px" }}
                      name="rateWeight"
                      value={formData.rateWeight}
                      onChange={handleInputChange}
                    >
                      <option value="kg">kg</option>
                      <option value="m³">m³</option>
                      <option value="Container">Container</option>
                    </select>
                  </div>
                  <span className="separator">-----</span>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="R 1000000/ton"
                    style={{ width: "60%" }}
                    name="rate"
                    value={formData.rate}
                    onChange={(e) => {
                      // Allow only numbers and decimal point
                      const value = e.target.value
                      if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                        handleInputChange(e)
                      }
                    }}
                  />
                </div>
                {(formData.rateWeight === "kg" || formData.rateWeight === "m³") && (
                  <div
                    className="weight-input-group"
                    style={{ marginTop: "10px", display: "flex", alignItems: "center" }}
                  >
                    <label style={{ marginRight: "10px" }}>{formData.rateWeight}</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={`Enter weight in ${formData.rateWeight}`}
                      style={{ width: "60%" }}
                      name="weight"
                      value={formData.weight}
                      onChange={(e) => {
                        // Allow only numbers and decimal point
                        const value = e.target.value
                        if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                          handleInputChange(e)
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="form-row1">
              <div className="form-group">
                <label style={{ marginLeft: "281px" }}>Trailer Size</label>
                <div className="counter-container">
                  <label style={{ marginTop: "40px" }}>No. of Containers</label>
                  <div className="counter">
                    <span>6m</span>
                    <input
                      type="number"
                      value={formData.num_six_meters}
                      min="0"
                      name="num_six_meters"
                      onChange={(e) => handleContainerCountChange("num_six_meters", e.target.value)}
                    />
                  </div>
                  <div className="counter">
                    <span>12m</span>
                    <input
                      type="number"
                      value={formData.num_twelve_meters}
                      min="0"
                      name="num_twelve_meters"
                      onChange={(e) => handleContainerCountChange("num_twelve_meters", e.target.value)}
                    />
                  </div>
                  <div className="counter">
                    <span>Abnormal</span>
                    <input
                      type="number"
                      value={formData.num_abnormal}
                      min="0"
                      name="num_abnormal"
                      onChange={(e) => handleContainerCountChange("num_abnormal", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>VAT Rate</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Vat Rate"
                  value={`${formData.vat}%`}
                  name="vat"
                  style={{ width: "20%" }}
                  readOnly
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-row1">
              <div className="form-group full-width">
                <label>Description from client</label>
                <textarea
                  className="form-textarea"
                  placeholder="Description from client, like type of goods etc"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                ></textarea>
              </div>
            </div>
          </div>

          <div className="button-container1">
            <button
              className="add-container-button"
              onClick={handleSubmit}
              disabled={
                isLoading.clients || isLoading.shipmentTypes || clients.length === 0 || shipmentTypes.length === 0
              }
            >
              Add Container Details
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ControllerInstructions

