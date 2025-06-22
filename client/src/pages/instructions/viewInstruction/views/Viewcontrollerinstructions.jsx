"use client"

import { useState, useEffect, useRef } from "react"
import "../../css/ViewClientInstruction.css" // Changed from controllerinstruction.css
import { useNavigate, useLocation } from "react-router-dom"
import ErrorModal from "../../../../components/ErrorModal.jsx"
import api from "../../../../api"

// Rest of the component code remains exactly the same...
const Viewcontrollerinstructions = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const instructionId = location.state?.instructionId
  const preservedFormData = location.state?.preservedFormData

  // Extract any additional state that was passed from DirectorMonitorInstructions
  const clientId = location.state?.clientId
  const clientName = location.state?.clientName
  const selectedMonth = location.state?.selectedMonth
  const selectedYear = location.state?.selectedYear
  const activeFilter = location.state?.activeFilter

  // Log the received state for debugging
  console.log("Viewcontrollerinstructions received state:", {
    instructionId,
    clientId,
    clientName,
    selectedMonth,
    selectedYear,
    activeFilter,
  })

  // Create refs for each date input
  const pickupDateRef = useRef(null)
  const etaDateRef = useRef(null)
  const deadlineDateRef = useRef(null)

  // State for form data
  const [formData, setFormData] = useState({
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
    bookingRef: "", // Added booking ref field
    rateWeight: "kg",
    rate: "",
    weight: "", // Added weight field
    num_six_meters: 0,
    num_twelve_meters: 0,
    num_abnormal: 0,
    vat: 15,
    description: "",
    status: "",
    vesselName: "", // Added vessel name field
    voyageNo: "", // Added voyage number field
    imoNo: "", // Added IMO number field
    flagReg: "", // Added flag registration field
  })

  // State to track if shipment type is Import
  const [isImport, setIsImport] = useState(false)

  // State for clients and shipment types
  const [clients, setClients] = useState([])
  const [shipmentTypes, setShipmentTypes] = useState([])
  const [isLoading, setIsLoading] = useState({
    clients: true,
    shipmentTypes: true,
    instruction: instructionId ? true : false,
  })

  // State for error modal
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    message: "",
  })

  // State for success message
  const [successMessage, setSuccessMessage] = useState("")

  // Style for non-editable fields - applied to ALL fields
  const nonEditableStyle = {
    backgroundColor: "#f0f0f0",
    cursor: "not-allowed",
    opacity: 0.7,
  }

  // Format date from ISO to MM/DD/YYYY
  const formatDateForDisplay = (isoDate) => {
    if (!isoDate) return ""
    const date = new Date(isoDate)
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    })
  }

  // Format time from HH:MM:SS to hh:mm AM/PM
  const formatTimeForDisplay = (time) => {
    if (!time) return ""
    const [hours, minutes] = time.split(":")
    const hour = Number.parseInt(hours, 10)
    const ampm = hour >= 12 ? "PM" : "AM"
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  // Format weight to 2 decimal places
  const formatWeightForDisplay = (weight) => {
    if (weight === null || weight === undefined || weight === "") {
      return "No Weight Amount Provided"
    }
    return Number.parseFloat(weight).toFixed(2)
  }

  // Handle back button click - fixed to ensure clientId is passed correctly
  const handleBackClick = () => {
    console.log("Navigating back to DirectorMonitorInstructions with state:", {
      clientId,
      clientName,
      selectedMonth,
      selectedYear,
      activeFilter,
    })

    navigate("/CompanyInstructions", {
      state: {
        clientId: clientId,
        clientName: clientName,
        selectedMonth: selectedMonth,
        selectedYear: selectedYear,
        activeFilter: activeFilter,
      },
    })
  }

  // Fetch clients, shipment types, and instruction data on component mount
  useEffect(() => {
    fetchClients()
    fetchShipmentTypes()

    if (preservedFormData) {
      // Use preserved form data if available (coming back from container details)
      setFormData(preservedFormData)
      // Set isImport based on the preserved shipment type
      const shipmentTypeName = preservedFormData.shipmentTypeName || ""
      setIsImport(shipmentTypeName.toLowerCase() === "import")
      setIsLoading((prev) => ({ ...prev, instruction: false }))
    } else if (instructionId) {
      // Otherwise fetch instruction data if ID is provided
      fetchInstructionData(instructionId)
    }
  }, [instructionId, preservedFormData])

  // Fetch instruction data by ID
  const fetchInstructionData = async (id) => {
    setIsLoading((prev) => ({ ...prev, instruction: true }))
    try {
      console.log(`Fetching instruction data for ID: ${id}`)
      const response = await api.get(`/api/instruction/${id}`)
      const data = response.data

      console.log("Instruction data received:", data)

      // Format dates and times for display
      const formattedData = {
        clientId: data.client.toString(),
        representative: data.representative || "",
        contactDetails: data.cellnum || "",
        email: data.email || "",
        shipmentTypeId: data.shipment_type.toString(),
        shipmentTypeName: data.shipmenttype || "",
        task: data.task || "",
        pickup: data.pickup || "",
        dropoff: data.dropoff || "",
        hazardous: data.hazardous || false,
        surcharges: data.surchages || false,
        pickupTime: formatTimeForDisplay(data.pickuptime) || "",
        pickupDate: formatDateForDisplay(data.pickupdate) || "",
        stackDate: formatDateForDisplay(data.stackdate) || "",
        deadline: formatDateForDisplay(data.deadline) || "",
        fileRef: data.fileref || "",
        bookingRef: data.booking_ref || "", // Added booking ref field
        rateWeight: data.rateweight || "kg",
        rate: data.rate ? data.rate.toString() : "",
        weight: data.weight ? formatWeightForDisplay(data.weight) : "No Weight Amount Provided", // Format weight
        num_six_meters: data.num_six_meters || 0,
        num_twelve_meters: data.num_twelve_meters || 0,
        num_abnormal: data.num_abnormal || 0,
        vat: data.vat || 15,
        description: data.description || "",
        status: data.status || "",
        vesselName: data.vessel_name || "", // Added vessel name field
        voyageNo: data.voyage_num || "", // Added voyage number field
        imoNo: data.imo_num || "", // Added IMO number field
        flagReg: data.flag_reg || "", // Added flag registration field
      }

      setFormData(formattedData)

      // Set isImport based on the fetched shipment type
      const shipmentTypeName = data.shipmenttype || ""
      setIsImport(shipmentTypeName.toLowerCase() === "import")
    } catch (error) {
      console.error("Error fetching instruction data:", error)
      let errorMessage = "Failed to fetch instruction data. Please try again."

      if (error.response) {
        errorMessage = `Server error: ${error.response.status} ${error.response.statusText}`
      } else if (error.request) {
        errorMessage = "Network error. Please check your connection."
      }

      setErrorModal({
        isOpen: true,
        message: errorMessage,
      })
    } finally {
      setIsLoading((prev) => ({ ...prev, instruction: false }))
    }
  }

  // Fetch clients from API
  const fetchClients = async () => {
    setIsLoading((prev) => ({ ...prev, clients: true }))
    try {
      console.log("Fetching clients...")
      const response = await api.get("/api/clients")
      const data = response.data

      console.log("Clients data received:", data.length, "records")
      setClients(data)
    } catch (error) {
      console.error("Error fetching clients:", error)
      let errorMessage = "Failed to fetch clients. Please try again."

      if (error.response) {
        errorMessage = `Server error: ${error.response.status} ${error.response.statusText}`
      } else if (error.request) {
        errorMessage = "Network error. Please check your connection."
      }

      setErrorModal({
        isOpen: true,
        message: errorMessage,
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
      const response = await api.get("/api/shipment-types")
      const data = response.data

      console.log("Shipment types data received:", data.length, "records")
      setShipmentTypes(data)
    } catch (error) {
      console.error("Error fetching shipment types:", error)
      let errorMessage = "Failed to fetch shipment types. Please try again."

      if (error.response) {
        errorMessage = `Server error: ${error.response.status} ${error.response.statusText}`
      } else if (error.request) {
        errorMessage = "Network error. Please check your connection."
      }

      setErrorModal({
        isOpen: true,
        message: errorMessage,
      })
      setShipmentTypes([])
    } finally {
      setIsLoading((prev) => ({ ...prev, shipmentTypes: false }))
    }
  }

  // Handle view container details
  const handleViewContainerDetails = () => {
    // Calculate total containers
    const totalContainers = formData.num_six_meters + formData.num_twelve_meters + formData.num_abnormal

    // Navigate to container details page with state
    navigate("/ViewcontrollerInstructionDetails", {
      state: {
        controllerData: formData,
        isImport: isImport,
        totalContainers: totalContainers,
        instructionId: instructionId,
        // Pass through the original navigation state for when we return
        clientId: clientId,
        clientName: clientName,
        selectedMonth: selectedMonth,
        selectedYear: selectedYear,
        activeFilter: activeFilter,
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
    if (instructionId) {
      fetchInstructionData(instructionId)
    }

    setErrorModal({
      isOpen: false,
      message: "",
    })
  }

  return (
    <div className="controller-instruction-page-wrapper">
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
        <button className="back-button" onClick={handleBackClick}>
          Back
        </button>
        {clientName && (
          <span className="client-name" style={{ fontWeight: "bold", marginLeft: "10px", display: "none" }}>
            {clientName} {clientId ? `(Client ID: ${clientId})` : ""}
          </span>
        )}
      </div>

      {/* Success Message */}
      {successMessage && (
        <div
          className="success-message"
          style={{
            backgroundColor: "#d4edda",
            color: "#155724",
            padding: "10px",
            borderRadius: "4px",
            margin: "10px 0",
            textAlign: "center",
          }}
        >
          {successMessage}
        </div>
      )}

      {/* Loading indicator or retry button */}
      {isLoading.clients || isLoading.shipmentTypes || isLoading.instruction ? (
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

      {/* Form with light blue background and sections - EXACT SAME STRUCTURE AS ControllerInstructions */}
      <div className="form-container">
        {/* Section 1: Client Information */}
        <div className="form-section client-info-section">
          <div className="form-row">
            <div className="form-field">
              <label>Client</label>
              <div className="select-wrapper">
                <select
                  className="dropdown"
                  name="clientId"
                  value={formData.clientId}
                  disabled={true}
                  style={nonEditableStyle}
                >
                  <option value="" disabled>
                    Select Client
                  </option>
                  {clients.map((client) => (
                    <option key={client.m5clientkey} value={client.m5clientkey}>
                      {client.companyname}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-field">
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
            <div className="form-field">
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
            <div className="form-field">
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

        {/* Section 2: Shipment Information */}
        <div className="form-section">
          <div className="form-row">
            <div className="form-field">
              <label>Shipment Type</label>
              <div className="select-wrapper">
                <select
                  className="dropdown"
                  name="shipmentTypeId"
                  value={formData.shipmentTypeId}
                  disabled={true}
                  style={nonEditableStyle}
                >
                  <option value="" disabled>
                    Select Shipment
                  </option>
                  {shipmentTypes.map((type) => (
                    <option key={type.shipkey} value={type.shipkey}>
                      {type.shipmenttype}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-field">
              <label>Name of Task</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Input Name of Task"
                  name="task"
                  value={formData.task}
                  readOnly
                  style={nonEditableStyle}
                />
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Pick-Up Location</label>
              <div className="select-wrapper">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Pick-up location"
                  name="pickup"
                  value={formData.pickup}
                  readOnly
                  style={nonEditableStyle}
                />
              </div>
            </div>
            <div className="form-field">
              <label>Drop-off</label>
              <div className="select-wrapper">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Drop-off location"
                  name="dropoff"
                  value={formData.dropoff}
                  readOnly
                  style={nonEditableStyle}
                />
              </div>
            </div>
            <div className="form-field checkbox-container">
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="hazardous"
                  name="hazardous"
                  checked={formData.hazardous}
                  disabled={true}
                  style={nonEditableStyle}
                />
                <label htmlFor="hazardous">Hazardous Materials</label>
              </div>
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="surcharges"
                  name="surcharges"
                  checked={formData.surcharges}
                  disabled={true}
                  style={nonEditableStyle}
                />
                <label htmlFor="surcharges">Add Surcharges</label>
              </div>
            </div>
          </div>

          <div className="form-row date-row-with-separator">
            <div className="form-field">
              <label>Pick-up Time</label>
              <div className="date-input-group">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Time here"
                  name="pickupTime"
                  value={formData.pickupTime}
                  readOnly
                  style={nonEditableStyle}
                />
                <button className="calendar-button" style={{ visibility: "hidden" }}></button>
              </div>
            </div>
            <div className="form-field">
              <label>Pick-up Date</label>
              <div className="date-input-group">
                <input
                  type="text"
                  className="form-input"
                  ref={pickupDateRef}
                  placeholder="Date here"
                  name="pickupDate"
                  value={formData.pickupDate}
                  readOnly
                  style={nonEditableStyle}
                />
                <button className="calendar-button" style={{ visibility: "hidden" }}></button>
              </div>
            </div>
            <div className="form-field">
              <label>{isImport ? "ETA" : "Stack Date"}</label>
              <div className="date-input-group">
                <input
                  type="text"
                  className="form-input"
                  ref={etaDateRef}
                  placeholder="Date here"
                  name="stackDate"
                  value={formData.stackDate}
                  readOnly
                  style={nonEditableStyle}
                />
                <button className="calendar-button" style={{ visibility: "hidden" }}></button>
              </div>
            </div>
            <div className="form-field">
              <label>Deadline</label>
              <div className="date-input-group">
                <input
                  type="text"
                  className="form-input"
                  ref={deadlineDateRef}
                  placeholder="Date here"
                  name="deadline"
                  value={formData.deadline}
                  readOnly
                  style={nonEditableStyle}
                />
                <button className="calendar-button" style={{ visibility: "hidden" }}></button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: File Reference and Rates */}
        <div className="form-section">
          <div className="form-row">
            <div className="form-field">
              <label>File Ref</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Upload file number here"
                  name="fileRef"
                  value={formData.fileRef}
                  readOnly
                  style={nonEditableStyle}
                />
              </div>
            </div>
            <div className="form-field rates-container">
              <label>Rates per</label>
              <div className="rates-input-group">
                <div className="select-wrapper small">
                  <select
                    className="dropdown"
                    name="rateWeight"
                    value={formData.rateWeight}
                    disabled={true}
                    style={nonEditableStyle}
                  >
                    <option value="kg">kg</option>
                    <option value="m³">m³</option>
                    <option value="Container">Container</option>
                  </select>
                </div>
                <div className="input-wrapper">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="R 1000000/ton"
                    name="rate"
                    value={formData.rate}
                    readOnly
                    style={nonEditableStyle}
                  />
                </div>
              </div>
              {(formData.rateWeight === "kg" || formData.rateWeight === "m³") && (
                <div className="weight-input-group">
                  <label>{formData.rateWeight}</label>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      className="form-input"
                      placeholder={`Enter weight in ${formData.rateWeight}`}
                      name="weight"
                      value={formData.weight}
                      readOnly
                      style={nonEditableStyle}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="form-row trailer-container">
            <div className="trailer-title">
              <h3>Trailer Size</h3>
            </div>
            <div className="container-section">
              <div className="container-label">
                <label>No. of Containers</label>
              </div>
              <div className="container-inputs">
                <div className="container-input">
                  <label>6m</label>
                  <input
                    type="number"
                    value={formData.num_six_meters}
                    min="0"
                    name="num_six_meters"
                    readOnly
                    style={nonEditableStyle}
                  />
                </div>
                <div className="container-input">
                  <label>12m</label>
                  <input
                    type="number"
                    value={formData.num_twelve_meters}
                    min="0"
                    name="num_twelve_meters"
                    readOnly
                    style={nonEditableStyle}
                  />
                </div>
                <div className="container-input">
                  <label>Abnormal</label>
                  <input
                    type="number"
                    value={formData.num_abnormal}
                    min="0"
                    name="num_abnormal"
                    readOnly
                    style={nonEditableStyle}
                  />
                </div>
              </div>
              <div className="vat-container">
                <label>VAT Rate</label>
                <input
                  type="text"
                  className="form-input"
                  value={`${formData.vat}%`}
                  name="vat"
                  readOnly
                  style={nonEditableStyle}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Vessel Information */}
        <div className="form-section vessel-info-section">
          <div className="form-row">
            <div className="form-field">
              <label>Vessel Name</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter vessel name"
                  name="vesselName"
                  value={formData.vesselName}
                  readOnly
                  style={nonEditableStyle}
                />
              </div>
            </div>
            <div className="form-field">
              <label>Voyage No.</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter voyage number"
                  name="voyageNo"
                  value={formData.voyageNo}
                  readOnly
                  style={nonEditableStyle}
                />
              </div>
            </div>
            <div className="form-field">
              <label>IMO No.</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter IMO number (numbers only)"
                  name="imoNo"
                  value={formData.imoNo}
                  readOnly
                  style={nonEditableStyle}
                />
              </div>
            </div>
            <div className="form-field">
              <label>Flag Reg</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter flag registration (letters only)"
                  name="flagReg"
                  value={formData.flagReg}
                  readOnly
                  style={nonEditableStyle}
                />
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Booking Reference</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter booking reference"
                  name="bookingRef"
                  value={formData.bookingRef}
                  readOnly
                  style={nonEditableStyle}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Description */}
        <div className="form-section description-section">
          <div className="form-row">
            <div className="form-field full-width">
              <label>Description from Client</label>
              <div className="textarea-wrapper">
                <textarea
                  className="form-textarea"
                  placeholder="Description from Client, like type of goods etc"
                  name="description"
                  value={formData.description}
                  readOnly
                  style={nonEditableStyle}
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="button-container">
          <button
            className="add-container-button"
            onClick={handleViewContainerDetails}
            disabled={
              isLoading.clients ||
              isLoading.shipmentTypes ||
              isLoading.instruction ||
              clients.length === 0 ||
              shipmentTypes.length === 0
            }
          >
            See Container Details
          </button>
        </div>
      </div>
    </div>
  )
}

export default Viewcontrollerinstructions
