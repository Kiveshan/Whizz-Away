
"use client"

import { useState, useEffect, useRef } from "react"
import "../../css/viewcontrollerinstructions.css"
import { useNavigate, useLocation } from "react-router-dom"
import ErrorModal from "../../../../components/ErrorModal.jsx"
import api from "../../../../api"

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

  const fieldRefs = {
    clientId: useRef(null),
    shipmentTypeId: useRef(null),
    task: useRef(null),
    pickup: useRef(null),
    dropoff: useRef(null),
    pickupTime: useRef(null),
    pickupDate: useRef(null),
    stackDate: useRef(null),
    deadline: useRef(null),
    bookingRef: useRef(null),
    fileRef: useRef(null),
    rate: useRef(null),
    sixMeterRate: useRef(null),
    twelveMeterRate: useRef(null),
    abnormalRate: useRef(null),
    weight: useRef(null),
    description: useRef(null),
    vesselName: useRef(null),
    voyageNo: useRef(null),
    imoNo: useRef(null),
    flagReg: useRef(null),
  }

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
    bookingRef: "",
    rateWeight: "Container",
    rate: "",
    weight: "",
    num_six_meters: 0,
    num_twelve_meters: 0,
    num_abnormal: 0,
    vat: 15,
    description: "",
    status: "",
    vesselName: "",
    voyageNo: "",
    imoNo: "",
    flagReg: "",
    total_cost: 0,
  })

  // Individual rate states
  const [sixMeterRate, setSixMeterRate] = useState("")
  const [twelveMeterRate, setTwelveMeterRate] = useState("")
  const [abnormalRate, setAbnormalRate] = useState("")
  const [weight, setWeight] = useState("")

  // State to track if shipment type is Import
  const [isImport, setIsImport] = useState(false)

  // State for clients and shipment types
  const [clients, setClients] = useState([])
  const [shipmentTypes, setShipmentTypes] = useState([])
  const [startingPoints, setStartingPoints] = useState([])
  const [destinations, setDestinations] = useState([])
  const [isLoading, setIsLoading] = useState({
    clients: true,
    shipmentTypes: true,
    startingPoints: true,
    destinations: true,
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

  // Format date from ISO to YYYY-MM-DD for date inputs
  const formatDateForInput = (isoDate) => {
    if (!isoDate) return ""
    const date = new Date(isoDate)
    return date.toISOString().split("T")[0]
  }

  // Format time from HH:MM:SS to HH:MM for time inputs
  const formatTimeForInput = (time) => {
    if (!time) return ""
    return time.substring(0, 5) // Get HH:MM from HH:MM:SS
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
    console.log("useEffect triggered with:", { instructionId, preservedFormData: !!preservedFormData })

    fetchClients()
    fetchShipmentTypes()
    fetchStartingPoints()
    fetchDestinations()

    // For view-only component, always fetch fresh data from database if instructionId exists
    if (instructionId) {
      console.log("Calling fetchInstructionData with ID:", instructionId)
      fetchInstructionData(instructionId)
    } else {
      console.log("No instructionId provided")
      // If no instructionId, redirect back
      navigate("/CompanyInstructions")
    }
  }, [instructionId, navigate])

  // Fetch instruction data by ID
  const fetchInstructionData = async (id) => {
    setIsLoading((prev) => ({ ...prev, instruction: true }))
    try {
      console.log(`Fetching instruction data for ID: ${id}`)
      const response = await api.get(`/api/instruction/${id}`)
      const data = response.data

      console.log("Instruction data received:", data)

      // Format dates and times for input fields
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
        pickupTime: formatTimeForInput(data.pickuptime) || "",
        pickupDate: formatDateForInput(data.pickupdate) || "",
        stackDate: formatDateForInput(data.stackdate) || "",
        deadline: formatDateForInput(data.deadline) || "",
        fileRef: data.fileref || "",
        bookingRef: data.booking_ref || "",
        rateWeight: data.rateweight || "Container",
        rate: data.rate ? data.rate.toString() : "",
        weight: data.weight ? data.weight.toString() : "",
        num_six_meters: data.num_six_meters || 0,
        num_twelve_meters: data.num_twelve_meters || 0,
        num_abnormal: data.num_abnormal || 0,
        vat: data.vat || 15,
        description: data.description || "",
        status: data.status || "",
        vesselName: data.vessel_name || "",
        voyageNo: data.voyage_num || "",
        imoNo: data.imo_num || "",
        flagReg: data.flag_reg || "",
        total_cost: data.total_cost || 0,
      }

      setFormData(formattedData)

      // Set individual rates if available - using correct field names from database
      setSixMeterRate(data.rateper_6 ? data.rateper_6.toString() : "")
      setTwelveMeterRate(data.rateper_12 ? data.rateper_12.toString() : "")
      setAbnormalRate(data.rateper_abnormal ? data.rateper_abnormal.toString() : "")
      setWeight(data.weight ? data.weight.toString() : "")

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

  // Fetch starting points from API
  const fetchStartingPoints = async () => {
    setIsLoading((prev) => ({ ...prev, startingPoints: true }))
    try {
      console.log("Fetching starting points...")
      const response = await api.get("/api/starting-points")
      const data = response.data

      console.log("Starting points data received:", data.length, "records")
      setStartingPoints(data)
    } catch (error) {
      console.error("Error fetching starting points:", error)
      let errorMessage = "Failed to fetch starting points. Please try again."

      if (error.response) {
        errorMessage = `Server error: ${error.response.status} ${error.response.statusText}`
      } else if (error.request) {
        errorMessage = "Network error. Please check your connection."
      }

      setErrorModal({
        isOpen: true,
        message: errorMessage,
      })
      setStartingPoints([])
    } finally {
      setIsLoading((prev) => ({ ...prev, startingPoints: false }))
    }
  }

  // Fetch destinations from API
  const fetchDestinations = async () => {
    setIsLoading((prev) => ({ ...prev, destinations: true }))
    try {
      console.log("Fetching destinations...")
      const response = await api.get("/api/destinations")
      const data = response.data

      console.log("Destinations data received:", data.length, "records")
      setDestinations(data)
    } catch (error) {
      console.error("Error fetching destinations:", error)
      let errorMessage = "Failed to fetch destinations. Please try again."

      if (error.response) {
        errorMessage = `Server error: ${error.response.status} ${error.response.statusText}`
      } else if (error.request) {
        errorMessage = "Network error. Please check your connection."
      }

      setErrorModal({
        isOpen: true,
        message: errorMessage,
      })
      setDestinations([])
    } finally {
      setIsLoading((prev) => ({ ...prev, destinations: false }))
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
    if (isLoading.clients || isLoading.shipmentTypes || isLoading.startingPoints || isLoading.destinations) {
      return // Don't retry if already loading
    }

    fetchClients()
    fetchShipmentTypes()
    fetchStartingPoints()
    fetchDestinations()
    if (instructionId) {
      fetchInstructionData(instructionId)
    }

    setErrorModal({
      isOpen: false,
      message: "",
    })
  }

  const openCalendar = (ref) => {
    ref.current.click()
  }

  return (
    <div className="view-controller-instructions-unique-wrapper">
      {/* Error Modal */}
      {errorModal.isOpen && (
        <ErrorModal
          isOpen={errorModal.isOpen}
          message={errorModal.message}
          onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
        />
      )}

      {/* Success Message */}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <div className="view-controller-instructions-header">
        <button className="view-controller-instructions-back-button" onClick={handleBackClick}>
          Back
        </button>
      </div>

      {/* Loading indicator or retry button */}
      {isLoading.clients ||
      isLoading.shipmentTypes ||
      isLoading.startingPoints ||
      isLoading.destinations ||
      isLoading.instruction ? (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <p>Loading data...</p>
        </div>
      ) : clients.length === 0 ||
        shipmentTypes.length === 0 ||
        startingPoints.length === 0 ||
        destinations.length === 0 ? (
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

      <div className="view-controller-instructions-form-container" style={{ maxWidth: "1200px" }}>
        {/* Client Information Section */}
        <div className="view-controller-instructions-form-section view-controller-instructions-client-info-section">
          <div className="view-controller-instructions-form-row">
            <div className="view-controller-instructions-form-field">
              <label>Client</label>
              <div className="view-controller-instructions-select-wrapper" ref={fieldRefs.clientId}>
                <select
                  className="view-controller-instructions-dropdown"
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
            <div className="view-controller-instructions-form-field">
              <label>Representative</label>
              <input
                type="text"
                className="view-controller-instructions-form-input"
                placeholder="Autoload representative"
                name="representative"
                value={formData.representative}
                readOnly
                style={nonEditableStyle}
              />
            </div>
            <div className="view-controller-instructions-form-field">
              <label>Contact Details</label>
              <input
                type="text"
                className="view-controller-instructions-form-input"
                placeholder="Autoload contact details"
                name="contactDetails"
                value={formData.contactDetails}
                readOnly
                style={nonEditableStyle}
              />
            </div>
            <div className="view-controller-instructions-form-field">
              <label>Email</label>
              <input
                type="email"
                className="view-controller-instructions-form-input"
                placeholder="Autoload email"
                name="email"
                value={formData.email}
                readOnly
                style={nonEditableStyle}
              />
            </div>
          </div>
        </div>

        {/* Container and Booking Section */}
        <div className="view-controller-instructions-form-section">
          <div className="view-controller-instructions-form-row view-controller-instructions-trailer-container">
            <div className="view-controller-instructions-container-section">
              <div className="view-controller-instructions-container-group">
                <div className="view-controller-instructions-container-label">
                  <span className="view-controller-instructions-trailer-size-label">Trailer Size</span>
                  <label>No. of Containers</label>
                </div>
                <div className="view-controller-instructions-container-inputs">
                  <div className="view-controller-instructions-container-input">
                    <label>6m</label>
                    <div className="view-controller-instructions-container-rate-group">
                      <input
                        type="number"
                        value={formData.num_six_meters}
                        min="0"
                        name="num_six_meters"
                        readOnly
                        style={nonEditableStyle}
                      />
                      <div
                        className="view-controller-instructions-input-wrapper view-controller-instructions-rate-input"
                        ref={fieldRefs.sixMeterRate}
                      >
                        <input
                          type="text"
                          className="view-controller-instructions-form-input"
                          placeholder="Rate"
                          value={sixMeterRate}
                          readOnly
                          style={nonEditableStyle}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="view-controller-instructions-container-input">
                    <label>12m</label>
                    <div className="view-controller-instructions-container-rate-group">
                      <input
                        type="number"
                        value={formData.num_twelve_meters}
                        min="0"
                        name="num_twelve_meters"
                        readOnly
                        style={nonEditableStyle}
                      />
                      <div
                        className="view-controller-instructions-input-wrapper view-controller-instructions-rate-input"
                        ref={fieldRefs.twelveMeterRate}
                      >
                        <input
                          type="text"
                          className="view-controller-instructions-form-input"
                          placeholder="Rate"
                          value={twelveMeterRate}
                          readOnly
                          style={nonEditableStyle}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="view-controller-instructions-container-input">
                    <label>Abnormal</label>
                    <div className="view-controller-instructions-container-rate-group">
                      <input
                        type="number"
                        value={formData.num_abnormal}
                        min="0"
                        name="num_abnormal"
                        readOnly
                        style={nonEditableStyle}
                      />
                      <div
                        className="view-controller-instructions-input-wrapper view-controller-instructions-rate-input"
                        ref={fieldRefs.abnormalRate}
                      >
                        <input
                          type="text"
                          className="view-controller-instructions-form-input"
                          placeholder="Rate"
                          value={abnormalRate}
                          readOnly
                          style={nonEditableStyle}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hazardous and Surcharges Checkboxes */}
                <div
                  className="view-controller-instructions-form-row"
                  style={{ marginTop: "16px", marginBottom: "16px", marginLeft: "10px" }}
                >
                  <div
                    className="view-controller-instructions-form-field"
                    style={{ display: "flex", flexDirection: "row", gap: "30px", alignItems: "center" }}
                  >
                    <label className="view-controller-instructions-checkbox-container" style={{ margin: "5px 0" }}>
                      <input
                        type="checkbox"
                        name="hazardous"
                        checked={formData.hazardous || false}
                        disabled={true}
                        style={nonEditableStyle}
                      />
                      <span className="view-controller-instructions-checkmark"></span>
                      Hazardous Materials
                    </label>
                    <label className="view-controller-instructions-checkbox-container" style={{ margin: "5px 0" }}>
                      <input
                        type="checkbox"
                        name="surcharges"
                        checked={formData.surcharges || false}
                        disabled={true}
                        style={nonEditableStyle}
                      />
                      <span className="view-controller-instructions-checkmark"></span>
                      Add Surcharges
                    </label>
                  </div>
                </div>
              </div>

              <div
                className="view-controller-instructions-booking-vertical-group"
                style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px", maxWidth: "220px" }}
              >
                <div className="view-controller-instructions-form-field">
                  <label>Booking Reference</label>
                  <div className="view-controller-instructions-input-wrapper" ref={fieldRefs.bookingRef}>
                    <input
                      type="text"
                      className="view-controller-instructions-form-input"
                      placeholder="Enter booking ref"
                      name="bookingRef"
                      value={formData.bookingRef}
                      readOnly
                      style={nonEditableStyle}
                    />
                  </div>
                </div>
                <div className="view-controller-instructions-form-field">
                  <label>File Ref</label>
                  <div className="view-controller-instructions-input-wrapper" ref={fieldRefs.fileRef}>
                    <input
                      type="text"
                      className="view-controller-instructions-form-input"
                      placeholder="Enter file ref"
                      name="fileRef"
                      value={formData.fileRef}
                      readOnly
                      style={nonEditableStyle}
                    />
                  </div>
                </div>
                <div className="view-controller-instructions-form-field" style={{ maxWidth: "120px" }}>
                  <label>VAT Rate</label>
                  <div className="view-controller-instructions-input-wrapper">
                    <input
                      type="text"
                      className="view-controller-instructions-form-input"
                      value={`${formData.vat || 15}%`}
                      readOnly
                      style={nonEditableStyle}
                    />
                  </div>
                </div>

                {/* Rates per dropdown */}
                <div className="view-controller-instructions-form-field" style={{ maxWidth: "160px" }}>
                  <label>Rates per</label>
                  <div className="view-controller-instructions-select-wrapper view-controller-instructions-small">
                    <select
                      className="view-controller-instructions-dropdown"
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
                  {/* conditional weight textbox */}
                  {(formData.rateWeight === "kg" || formData.rateWeight === "m³") && (
                    <div
                      className="view-controller-instructions-input-wrapper"
                      style={{ marginTop: "6px" }}
                      ref={fieldRefs.weight}
                    >
                      <input
                        type="text"
                        className="view-controller-instructions-form-input"
                        placeholder={`Enter weight in ${formData.rateWeight}`}
                        name="weight"
                        value={formData.weight || weight}
                        readOnly
                        style={nonEditableStyle}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Date Time Group */}
              <div className="view-controller-instructions-date-time-group">
                <div
                  className="view-controller-instructions-shipment-task-row"
                  style={{ order: -1, marginBottom: "8px" }}
                >
                  <div className="view-controller-instructions-form-field view-controller-instructions-small-field">
                    <label>Shipment Type</label>
                    <div className="view-controller-instructions-select-wrapper" ref={fieldRefs.shipmentTypeId}>
                      <select
                        className="view-controller-instructions-dropdown"
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
                  <div className="view-controller-instructions-form-field view-controller-instructions-small-field">
                    <label>Name of Task</label>
                    <div className="view-controller-instructions-input-wrapper" ref={fieldRefs.task}>
                      <input
                        type="text"
                        className="view-controller-instructions-form-input"
                        placeholder="Input Name of Task"
                        name="task"
                        value={formData.task}
                        readOnly
                        style={nonEditableStyle}
                      />
                    </div>
                  </div>
                </div>

                <div className="view-controller-instructions-date-time-row-1" style={{ display: "flex", gap: "15px" }}>
                  <div className="view-controller-instructions-form-field" style={{ flex: "1", minWidth: "0" }}>
                    <label>Pick-Up Location</label>
                    <div
                      className="view-controller-instructions-date-input-group"
                      ref={fieldRefs.pickup}
                      style={{ width: "100%" }}
                    >
                      <select
                        className="view-controller-instructions-form-input"
                        name="pickup"
                        value={formData.pickup}
                        disabled={true}
                        style={{ ...nonEditableStyle, width: "100%", maxWidth: "75%" }}
                      >
                        <option value="" disabled>
                          Select Pick-Up Location
                        </option>
                        {startingPoints.map((point, index) => (
                          <option key={index} value={point.startingpoint}>
                            {point.startingpoint}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="view-controller-instructions-form-field" style={{ flex: "1", minWidth: "0" }}>
                    <label>Drop-off Location</label>
                    <div
                      className="view-controller-instructions-date-input-group"
                      ref={fieldRefs.dropoff}
                      style={{ width: "100%" }}
                    >
                      <select
                        className="view-controller-instructions-form-input"
                        name="dropoff"
                        value={formData.dropoff}
                        disabled={true}
                        style={{ ...nonEditableStyle, width: "100%", maxWidth: "75%" }}
                      >
                        <option value="" disabled>
                          Select Drop-off Location
                        </option>
                        {destinations.map((dest, index) => (
                          <option key={index} value={dest.destination}>
                            {dest.destination}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div
                  className="view-controller-instructions-date-time-row-1"
                  style={{ marginTop: "15px", display: "flex", gap: "15px" }}
                >
                  <div className="view-controller-instructions-form-field" style={{ flex: "1", minWidth: "0" }}>
                    <label>Pick-up Time</label>
                    <div
                      className="view-controller-instructions-date-input-group"
                      ref={fieldRefs.pickupTime}
                      style={{ width: "100%" }}
                    >
                      <input
                        type="time"
                        className="view-controller-instructions-form-input"
                        placeholder="Time here"
                        name="pickupTime"
                        value={formData.pickupTime}
                        readOnly
                        style={{ ...nonEditableStyle, width: "75%" }}
                      />
                      <button
                        className="view-controller-instructions-calendar-button"
                        style={{ visibility: "hidden" }}
                      ></button>
                    </div>
                  </div>
                  <div className="view-controller-instructions-form-field" style={{ flex: "1", minWidth: "0" }}>
                    <label>Pick-up Date</label>
                    <div
                      className="view-controller-instructions-date-input-group"
                      ref={fieldRefs.pickupDate}
                      style={{ width: "100%" }}
                    >
                      <input
                        type="date"
                        className="view-controller-instructions-form-input"
                        ref={pickupDateRef}
                        placeholder="Date here"
                        name="pickupDate"
                        value={formData.pickupDate}
                        readOnly
                        style={{ ...nonEditableStyle, width: "75%" }}
                      />
                      <button
                        className="view-controller-instructions-calendar-button"
                        style={{ visibility: "hidden" }}
                      ></button>
                    </div>
                  </div>
                </div>

                <div className="view-controller-instructions-date-time-row-2" style={{ display: "flex", gap: "15px" }}>
                  <div className="view-controller-instructions-form-field" style={{ flex: "1", minWidth: "0" }}>
                    <label>{isImport ? "ETA" : "Stack Date"}</label>
                    <div
                      className="view-controller-instructions-date-input-group"
                      ref={fieldRefs.stackDate}
                      style={{ width: "100%" }}
                    >
                      <input
                        type="date"
                        className="view-controller-instructions-form-input"
                        ref={etaDateRef}
                        placeholder="Date here"
                        name="stackDate"
                        value={formData.stackDate}
                        readOnly
                        style={{ ...nonEditableStyle, width: "75%" }}
                      />
                      <button
                        className="view-controller-instructions-calendar-button"
                        style={{ visibility: "hidden" }}
                      ></button>
                    </div>
                  </div>
                  <div className="view-controller-instructions-form-field" style={{ flex: "1", minWidth: "0" }}>
                    <label>Deadline</label>
                    <div
                      className="view-controller-instructions-date-input-group"
                      ref={fieldRefs.deadline}
                      style={{ width: "100%" }}
                    >
                      <input
                        type="date"
                        className="view-controller-instructions-form-input"
                        ref={deadlineDateRef}
                        placeholder="Date here"
                        name="deadline"
                        value={formData.deadline}
                        readOnly
                        style={{ ...nonEditableStyle, width: "75%" }}
                      />
                      <button
                        className="view-controller-instructions-calendar-button"
                        style={{ visibility: "hidden" }}
                      ></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vessel Information Section */}
        <div
          className="view-controller-instructions-form-section view-controller-instructions-vessel-info-section"
          style={{ marginTop: "16px" }}
        >
          <div
            className="view-controller-instructions-form-row view-controller-instructions-vessel-info-row"
            style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-start", width: "100%" }}
          >
            <div className="view-controller-instructions-form-field">
              <label>Vessel Name</label>
              <div className="view-controller-instructions-input-wrapper" ref={fieldRefs.vesselName}>
                <input
                  type="text"
                  className="view-controller-instructions-form-input"
                  placeholder="Enter vessel name"
                  name="vesselName"
                  value={formData.vesselName}
                  readOnly
                  style={nonEditableStyle}
                />
              </div>
            </div>
            <div className="view-controller-instructions-form-field">
              <label>Voyage No.</label>
              <div className="view-controller-instructions-input-wrapper" ref={fieldRefs.voyageNo}>
                <input
                  type="text"
                  className="view-controller-instructions-form-input"
                  placeholder="Enter voyage number"
                  name="voyageNo"
                  value={formData.voyageNo}
                  readOnly
                  style={nonEditableStyle}
                />
              </div>
            </div>
            <div className="view-controller-instructions-form-field">
              <label>IMO No.</label>
              <div className="view-controller-instructions-input-wrapper" ref={fieldRefs.imoNo}>
                <input
                  type="text"
                  className="view-controller-instructions-form-input"
                  placeholder="Enter IMO number (numbers only)"
                  name="imoNo"
                  value={formData.imoNo}
                  readOnly
                  style={nonEditableStyle}
                />
              </div>
            </div>
            <div className="view-controller-instructions-form-field">
              <label>Flag Reg</label>
              <div className="view-controller-instructions-input-wrapper" ref={fieldRefs.flagReg}>
                <input
                  type="text"
                  className="view-controller-instructions-form-input"
                  placeholder="Enter flag registration (letters only)"
                  name="flagReg"
                  value={formData.flagReg}
                  readOnly
                  style={nonEditableStyle}
                />
              </div>
            </div>
            {/* Description from Client */}
            <div
              className="view-controller-instructions-form-field view-controller-instructions-description-field"
              style={{ flex: "1 1 180px", minWidth: "160px", maxWidth: "180px" }}
            >
              <label>Description from Client</label>
              <div className="view-controller-instructions-textarea-wrapper" ref={fieldRefs.description}>
                <textarea
                  className="view-controller-instructions-form-textarea"
                  placeholder="Description from Client"
                  name="description"
                  value={formData.description}
                  readOnly
                  style={{ ...nonEditableStyle, height: "60px", width: "100%", resize: "vertical" }}
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="view-controller-instructions-button-container">
          <button
            className="view-controller-instructions-add-container-button"
            onClick={handleViewContainerDetails}
            disabled={
              isLoading.clients ||
              isLoading.shipmentTypes ||
              isLoading.startingPoints ||
              isLoading.destinations ||
              isLoading.instruction ||
              clients.length === 0 ||
              shipmentTypes.length === 0 ||
              startingPoints.length === 0 ||
              destinations.length === 0
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
