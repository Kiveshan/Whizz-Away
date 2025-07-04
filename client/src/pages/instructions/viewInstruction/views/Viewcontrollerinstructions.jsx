
"use client"

import React, { useState, useEffect, useRef } from "react"
import "../../css/viewcontrollerinstructions.css"
import { useNavigate, useLocation } from "react-router-dom"
import ErrorModal from "../../../../components/ErrorModal"
import api from "../../../../api"
import "../../../../css/components.css"

const Viewcontrollerinstructions = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const isMounted = useRef(true)
  const instructionId = location.state?.instructionId
  const preservedFormData = location.state?.preservedFormData || {}
  
  // Form data state with default values
  const getDefaultFormData = () => ({
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
    surchargesAmount: "",
    num_six_meters: 0,
    num_twelve_meters: 0,
    num_abnormal: 0,
    pickupTime: "",
    pickupDate: "",
    stackDate: "",
    deadline: "",
    fileRef: "",
    bookingRef: "",
    rateWeight: "Container",
    weight: "",
    vat: 15,
    description: "",
    total_cost: 0,
    sixMeterRate: "",
    twelveMeterRate: "",
    abnormalRate: "",
    status: "",
    vesselName: "",
    unitrate: "",
    num_breakbulk: 0,
    rateper_breakbulk: ""
  });

  const [formData, setFormData] = useState(() => ({
    ...getDefaultFormData(),
    ...(preservedFormData || {})
  }))

  // Refs for form fields (minimal refs needed for view mode)
  const pickupDateRef = useRef(null)
  const etaDateRef = useRef(null)
  const deadlineDateRef = useRef(null)
  const vesselNameRef = useRef(null)

  // State for clients and shipment types
  const [clients, setClients] = useState([])
  const [shipmentTypes, setShipmentTypes] = useState([])
  const [startingPoints, setStartingPoints] = useState([])
  const [destinations, setDestinations] = useState([])
  const [sixMeterRate, setSixMeterRate] = useState("")
  const [twelveMeterRate, setTwelveMeterRate] = useState("")
  const [abnormalRate, setAbnormalRate] = useState("")
  const [weight, setWeight] = useState("")
  const [isLoading, setIsLoading] = useState({
    clients: true,
    shipmentTypes: true,
    startingPoints: true,
    destinations: true,
    instruction: !!instructionId
  })

  // State for container data
  const [containers, setContainers] = useState([])
  const [isLoadingContainers, setIsLoadingContainers] = useState(false)

  // State for error modal
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    message: "",
  })

  // State for success message
  const [successMessage, setSuccessMessage] = useState("")

  // State to track if shipment type is Import
  const [isImport, setIsImport] = useState(false)

  // State to track if shipment type is cross-haul or shipmentID is 3
  const [isCrossHaulOrSpecial, setIsCrossHaulOrSpecial] = useState(false)

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

  // Handle back button click
  const handleBackClick = () => {
    navigate(-1) // Go back to the previous page
  }

  // Track if initial data has been loaded
  const [initialDataLoaded, setInitialDataLoaded] = useState(false)

  // Fetch all required data on component mount
  useEffect(() => {
    console.log("useEffect triggered with:", { instructionId, preservedFormData: !!preservedFormData })

    const fetchData = async () => {
      try {
        if (!instructionId) {
          console.log("No instructionId provided")
          navigate("/CompanyInstructions")
          return
        }

        console.log("Calling fetchInstructionData with ID:", instructionId)
        await fetchInstructionData(instructionId)

        // First fetch clients and shipment types
        await Promise.all([
          fetchClients(),
          fetchShipmentTypes()
        ]);

        // Then fetch container details after formData is set
        fetchContainerDetails();

        // Mark initial data as loaded
        setInitialDataLoaded(true)
        console.log("Initial data loading complete")
      } catch (error) {
        console.error("Error in fetchData:", error)
        setErrorModal({
          isOpen: true,
          message: `Failed to load required data: ${error.message || 'Unknown error'}`
        })
      }
    }


    fetchData()
    
    // Cleanup function
    return () => {
      isMounted.current = false
    }
  }, [instructionId, navigate])

  // Fetch instruction data by ID
  const fetchInstructionData = async (id) => {
    if (!id) {
      console.error("No instruction ID provided")
      throw new Error("No instruction ID provided")
    }

    try {
      console.log(`Fetching instruction data for ID: ${id}`)
      const response = await api.get(`/api/instructions/instruction/${id}`)
      const data = response.data

      if (!data) {
        throw new Error("No data received from server")
      }
      
      // Log the received data for debugging
      console.log("API Response Data:", data)

      console.log("Instruction data received:", data)

      // Start with default form data and override with API data
      const defaultFormData = getDefaultFormData()
      
      // Format dates and times for input fields
      const formattedData = {
        ...defaultFormData,
        clientId: data.client?.toString() || "",
        representative: data.representative || "",
        contactDetails: data.cellnum || "",
        email: data.email || "",
        shipmentTypeId: data.shipment_type?.toString() || "",
        shipmentTypeName: data.shipmenttype || "",
        task: data.task || "",
        pickup: data.pickup || "",
        dropoff: data.dropoff || "",
        hazardous: Boolean(data.hazardous),
        surcharges: Boolean(data.surchages), // Note: This matches the database field name (missing 'r')
        surchargesAmount: data.surcharge?.toString() || "", // Changed from surcharges_amount to surcharge
        pickupTime: formatTimeForInput(data.pickuptime) || "",
        pickupDate: formatDateForInput(data.pickupdate) || "",
        stackDate: formatDateForInput(data.stackdate) || "",
        deadline: formatDateForInput(data.deadline) || "",
        fileRef: data.fileref || "",
        bookingRef: data.booking_ref || "",
        rateWeight: data.rateweight || "Container",
        rate: data.rate ? data.rate.toString() : "",
        weight: data.weight ? data.weight.toString() : "",
        num_six_meters: Number(data.num_six_meters) || 0,
        num_twelve_meters: Number(data.num_twelve_meters) || 0,
        num_abnormal: Number(data.num_abnormal) || 0,
        vat: Number(data.vat) || 15,
        description: data.description || "",
        status: data.status || "",
        vesselName: data.vessel_name || "",
        total_cost: Number(data.total_cost) || 0,
        rateper_6: data.rateper_6 ? Number(data.rateper_6) : 0,
        rateper_12: data.rateper_12 ? Number(data.rateper_12) : 0,
        rateper_abnormal: data.rateper_abnormal ? Number(data.rateper_abnormal) : 0,
        unitrate: data.unitrate || "",
        num_breakbulk: Number(data.num_breakbulk) || 0,
        rateper_breakbulk: data.rateper_breakbulk ? data.rateper_breakbulk.toString() : "",
      }

      console.log("Formatted data before setFormData:", formattedData)
      setFormData(formattedData)

      // Set individual rates if available - using correct field names from database
      setSixMeterRate(data.rateper_6 ? data.rateper_6.toString() : "")
      setTwelveMeterRate(data.rateper_12 ? data.rateper_12.toString() : "")
      setAbnormalRate(data.rateper_abnormal ? data.rateper_abnormal.toString() : "")
      setWeight(data.weight ? data.weight.toString() : "")

      // Set isImport based on the fetched shipment type
      const shipmentTypeName = data.shipmenttype || ""
      const isImportValue = shipmentTypeName.toLowerCase() === "import"
      console.log("Setting isImport to:", isImportValue)
      setIsImport(isImportValue)
      
      // Set isCrossHaulOrSpecial based on shipment type or ID
      const isCrossHaul = shipmentTypeName.toLowerCase() === "cross-haul" || shipmentTypeName.toLowerCase() === "cross haul"
      const isSpecialId = data.shipment_type?.toString() === "3"
      const isCrossHaulOrSpecialValue = isCrossHaul || isSpecialId
      console.log("Setting isCrossHaulOrSpecial to:", isCrossHaulOrSpecialValue, 
        "(shipmentTypeName: ", shipmentTypeName, ", shipment_type: ", data.shipment_type, ")")
      setIsCrossHaulOrSpecial(isCrossHaulOrSpecialValue)
      
      // After setting all state, ensure loading is set to false
      setIsLoading(prev => ({
        ...prev,
        instruction: false,
        clients: false,
        shipmentTypes: false,
        startingPoints: false,
        destinations: false
      }))
    } catch (error) {
      console.error("Error fetching instruction data:", error)
      let errorMessage = "Failed to fetch instruction data. Please try again."
      
      // Set loading to false on error
      setIsLoading(prev => ({
        ...prev,
        instruction: false
      }))

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
    try {
      console.log("Fetching clients...")
      const response = await api.get("/api/instructions/active-clients")
      const data = response.data

      if (!data || !Array.isArray(data)) {
        throw new Error("Invalid data format received from server")
      }

      console.log("Clients data received:", data.length, "records")
      setClients(data)
      return true
    } catch (error) {
      console.error("Error fetching clients:", error)
      // Don't show error for clients - we can proceed with empty clients list
      setClients([])
      return false
    }
  }

  // Fetch shipment types from API
  const fetchShipmentTypes = async () => {
    try {
      console.log("Fetching shipment types...")
      const response = await api.get("/api/instructions/shipment-types")
      const data = response.data

      if (!data || !Array.isArray(data)) {
        throw new Error("Invalid shipment types data format")
      }

      console.log("Shipment types data received:", data.length, "records")
      setShipmentTypes(data)
      return true
    } catch (error) {
      console.error("Error fetching shipment types:", error)
      // Set default shipment types if API fails
      const defaultTypes = [
        { id: 1, name: 'Import' },
        { id: 2, name: 'Export' },
        { id: 3, name: 'Cross Dock' },
        { id: 4, name: 'Empty Return' },
        { id: 5, name: 'Empty Collection' },
        { id: 6, name: 'Other' }
      ]
      console.log("Using default shipment types")
      setShipmentTypes(defaultTypes)
      return true
    }
  }

  // Fetch starting points from API
  const fetchStartingPoints = async () => {
    if (!formData.clientId) {
      console.log("No client selected, skipping starting points fetch")
      setIsLoading((prev) => ({ ...prev, startingPoints: false }))
      return true
    }
    
    setIsLoading((prev) => ({ ...prev, startingPoints: true }))
    try {
      console.log(`Fetching starting points for client ${formData.clientId}...`)
      const response = await api.get(`/api/instructions/client/${formData.clientId}/starting-points`)
      const data = response.data

      console.log("Starting points data received:", data.length, "records")
      setStartingPoints(data)
      setIsLoading((prev) => ({ ...prev, startingPoints: false }))
      return true
    } catch (error) {
      console.error("Error fetching starting points:", error)
      // Set default starting points if API fails
      setStartingPoints([
        'Durban',
        'Johannesburg',
        'Cape Town',
        'Port Elizabeth',
        'East London',
        'Other'
      ])
      setIsLoading((prev) => ({ ...prev, startingPoints: false }))
      return true
    }
  }

  // Fetch destinations from API
  const fetchDestinations = async () => {
    if (!formData.clientId || !formData.pickup) {
      console.log("No client or pickup selected, skipping destinations fetch")
      setIsLoading((prev) => ({ ...prev, destinations: false }))
      return true
    }
    
    setIsLoading((prev) => ({ ...prev, destinations: true }))
    try {
      console.log(`Fetching destinations for client ${formData.clientId} and pickup ${formData.pickup}...`)
      const response = await api.get(`/api/instructions/client/${formData.clientId}/destinations/${encodeURIComponent(formData.pickup)}`)
      const data = response.data

      console.log("Destinations data received:", data.length, "records")
      setDestinations(data)
      setIsLoading((prev) => ({ ...prev, destinations: false }))
      return true
    } catch (error) {
      console.error("Error fetching destinations:", error)
      // Set default destinations if API fails
      setDestinations([
        'Durban',
        'Johannesburg',
        'Cape Town',
        'Port Elizabeth',
        'East London',
        'Other'
      ])
      setIsLoading((prev) => ({ ...prev, destinations: false }))
      return true
    }
  }

  // Initialize containers based on controller data counts
  const initializeContainers = () => {
    if (!formData) {
      console.log("No formData available for container initialization");
      return [];
    }
    
    console.log("Initializing containers with formData:", {
      num_six_meters: formData.num_six_meters,
      num_twelve_meters: formData.num_twelve_meters,
      num_abnormal: formData.num_abnormal
    });
    
    const containersList = [];
    let containerId = 1;

    // Ensure we have valid numbers for container counts
    const sixMeters = parseInt(formData.num_six_meters) || 0;
    const twelveMeters = parseInt(formData.num_twelve_meters) || 0;
    const abnormal = parseInt(formData.num_abnormal) || 0;

    // Add 6m containers
    for (let i = 0; i < sixMeters; i++) {
      containersList.push({
        id: containerId++,
        containerKey: null,
        containerNum: "",
        weight: "",
        containerType: "6m",
        cargoDescription: ""
      });
    }

    // Add 12m containers
    for (let i = 0; i < twelveMeters; i++) {
      containersList.push({
        id: containerId++,
        containerKey: null,
        containerNum: "",
        weight: "",
        containerType: "12m",
        cargoDescription: ""
      });
    }

    // Add abnormal containers
    for (let i = 0; i < abnormal; i++) {
      containersList.push({
        id: containerId++,
        containerKey: null,
        containerNum: "",
        weight: "",
        containerType: "Abnormal",
        cargoDescription: ""
      });
    }

    console.log(`Initialized ${containersList.length} containers`);
    return containersList;
  };

  // Determine container type based on index and form data
  const determineContainerType = (index, data) => {
    if (!data) return "Unknown";
    const sixMCount = data.num_six_meters || 0;
    const twelveMCount = data.num_twelve_meters || 0;
    if (index < sixMCount) return "6m";
    if (index < sixMCount + twelveMCount) return "12m";
    return "Abnormal";
  };

  // Fetch container details
  const fetchContainerDetails = async () => {
    if (!instructionId) {
      console.log("No instructionId available for fetching container details");
      return;
    }
    
    // Wait for formData to be available
    if (!formData) {
      console.log("formData not available yet, waiting...");
      return;
    }
    
    console.log("Fetching container details with formData:", {
      instructionId,
      hasFormData: !!formData,
      containerCounts: formData ? {
        six_meters: formData.num_six_meters,
        twelve_meters: formData.num_twelve_meters,
        abnormal: formData.num_abnormal
      } : 'No formData'
    });
    
    setIsLoadingContainers(true);
    
    try {
      // First, try to fetch from the API
      const response = await api.get(`/api/instructions/containers/${instructionId}`);
      const data = response.data || [];
      
      console.log("Containers data from API:", data);
      
      if (data && data.length > 0) {
        // Map container data to match the expected format
        const containersList = data.map((container, index) => ({
          id: index + 1,
          containerKey: container.containerkey,
          containerNum: container.containernum ? container.containernum.toString() : "",
          weight: container.weight !== null ? container.weight.toString() : "",
          containerType: container.container_type || determineContainerType(index, formData),
          cargoDescription: container.cargo_description || ""
        }));
        console.log("Mapped containers list:", containersList);
        setContainers(containersList);
      } else {
        // If no containers found in API, initialize from form data
        console.log("No containers found in API, initializing from form data");
        const initializedContainers = initializeContainers();
        console.log("Initialized containers:", initializedContainers);
        setContainers(initializedContainers);
      }
    } catch (error) {
      console.error("Error fetching containers:", error);
      // On error (including 404), initialize from form data
      console.log("Error fetching containers, initializing from form data");
      const initializedContainers = initializeContainers();
      console.log("Initialized containers on error:", initializedContainers);
      setContainers(initializedContainers);
    } finally {
      setIsLoadingContainers(false);
    }
  };
  
  // Call fetchContainerDetails when formData changes
  useEffect(() => {
    if (instructionId && formData) {
      console.log("formData updated, fetching container details");
      fetchContainerDetails();
    }
  }, [formData, instructionId]);

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

  // Render loading state
  if (isLoading.instruction) {
    return (
      <div className="view-controller-instructions-unique-wrapper">
        <h2 className="view-controller-instructions-title">Loading Instruction...</h2>
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading instruction data, please wait...</p>
        </div>
      </div>
    )
  }

  // Render error state
  if (errorModal.isOpen) {
    return (
      <div className="view-controller-instructions-unique-wrapper">
        <ErrorModal
          isOpen={errorModal.isOpen}
          message={errorModal.message}
          onClose={() => setErrorModal({ isOpen: false, message: "" })}
        />
        <div className="text-center my-5">
          <h3>Error Loading Instruction</h3>
          <p className="text-danger">{errorModal.message}</p>
          <button 
            className="btn btn-primary mt-3"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Main content
  return (
    <div className="view-controller-instructions-unique-wrapper" style={{ paddingTop: '10px' }}>
      {/* Back Button - Top Left */}
      <div style={{ position: 'absolute', top: '10px', left: '20px', zIndex: 1000 }}>
        <button 
          className="view-controller-instructions-back-button"
          onClick={() => navigate('/CompanyInstructions')}
          style={{ margin: 0 }}
        >
          Back
        </button>
      </div>

      {/* Success Message */}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      {/* Loading indicator */}
      {!initialDataLoaded && (
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading form data...</p>
        </div>
      )}

      {/* Error state */}
      {initialDataLoaded && clients.length === 0 && (
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error Loading Data</h4>
          <p>Failed to load required client data. Please try again.</p>
          <button
            onClick={handleRetryFetch}
            className="btn btn-primary"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Form - Only show when data is loaded */}
      {initialDataLoaded && (
        <div className="view-controller-instructions-form-container" style={{ maxWidth: "1200px" }}>
        {/* Client Information Section */}
        <div className="view-controller-instructions-form-section view-controller-instructions-client-info-section" style={{ marginTop: '10px' }}>
          <div className="view-controller-instructions-form-row">
            <div className="view-controller-instructions-form-field">
              <label>Client</label>
              <div className="view-controller-instructions-select-wrapper">
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
                      <div className="view-controller-instructions-input-wrapper view-controller-instructions-rate-input">
                        <input
                          type="text"
                          className="view-controller-instructions-form-input"
                          placeholder="Rate"
                          value={formData.rateper_6}
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
                      <div className="view-controller-instructions-input-wrapper view-controller-instructions-rate-input">
                        <input
                          type="text"
                          className="view-controller-instructions-form-input"
                          placeholder="Rate"
                          value={formData.rateper_12}
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
                      <div className="view-controller-instructions-input-wrapper view-controller-instructions-rate-input">
                        <input
                          type="text"
                          className="view-controller-instructions-form-input"
                          placeholder="Rate"
                          value={formData.rateper_abnormal}
                          readOnly
                          style={nonEditableStyle}
                        />
                      </div>
                    </div>
                  </div>
                  {isCrossHaulOrSpecial && (
                    <div className="view-controller-instructions-container-input">
                      <label>Break Bulk</label>
                      <div className="view-controller-instructions-container-rate-group">
                        <input
                          type="number"
                          value={formData.num_breakbulk || 0}
                          min="0"
                          name="num_breakbulk"
                          readOnly
                          style={nonEditableStyle}
                        />
                        <div className="view-controller-instructions-input-wrapper view-controller-instructions-rate-input">
                          <input
                            type="text"
                            className="view-controller-instructions-form-input"
                            placeholder="Rate"
                            value={formData.rateper_breakbulk || ""}
                            readOnly
                            style={nonEditableStyle}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Hazardous and Surcharges Checkboxes */}
                <div
                  className="view-controller-instructions-form-row"
                  style={{ marginTop: "16px", marginLeft: "10px" }}
                >
                  <div
                    className="view-controller-instructions-form-field"
                    style={{ display: "flex", flexDirection: "column", gap: "10px" }}
                  >
                    <div style={{ display: "flex", gap: "30px", alignItems: "center" }}>
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
                    {formData.surcharges && (
                      <div style={{ marginTop: "5px", maxWidth: "200px" }}>
                        <input
                          type="text"
                          className="view-controller-instructions-form-input"
                          value={formData.surchargesAmount || ''}
                          readOnly
                          style={{ ...nonEditableStyle, width: '100%' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div
                className="view-controller-instructions-booking-vertical-group"
                style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px", maxWidth: "220px" }}
              >
                <div className="view-controller-instructions-form-field">
                  <label>Booking Reference</label>
                  <div className="view-controller-instructions-input-wrapper">
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
                  <div className="view-controller-instructions-input-wrapper">
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
                <div className="view-controller-instructions-form-field" style={{ maxWidth: "300px" }}>
                  <label>Unit per</label>
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
                      <option value="ton">ton</option>
                      <option value="Container">Container</option>
                    </select>
                  </div>
                  
                  {/* Container for rate and weight inputs */}
                  {(formData.rateWeight === "kg" || formData.rateWeight === "m³" || formData.rateWeight === "ton") && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                      {/* Unit rate textbox */}
                      <div style={{ flex: 1, minWidth: '100px' }}>
                        <label style={{ fontSize: '12px', marginBottom: '2px', display: 'block' }}>Rate per {formData.rateWeight}</label>
                        <input
                          type="text"
                          className="view-controller-instructions-form-input"
                          placeholder="Unit Rate"
                          name="unitrate"
                          value={formData.unitrate || ""}
                          readOnly
                          style={{ ...nonEditableStyle, width: '100%' }}
                        />
                      </div>
                      
                      {/* Weight textbox - only for kg and m³ */}
                      {(formData.rateWeight === "kg" || formData.rateWeight === "m³") && (
                        <div style={{ flex: 1, minWidth: '100px' }}>
                          <label style={{ fontSize: '12px', marginBottom: '2px', display: 'block' }}>Weight</label>
                          <input
                            type="text"
                            className="view-controller-instructions-form-input"
                            placeholder={`Weight in ${formData.rateWeight}`}
                            name="weight"
                            value={formData.weight || ""}
                            readOnly
                            style={{ ...nonEditableStyle, width: '100%' }}
                          />
                        </div>
                      )}
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
                    <div className="view-controller-instructions-select-wrapper">
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
                    <div className="view-controller-instructions-input-wrapper">
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
                    <div className="view-controller-instructions-date-input-group" style={{ width: "100%" }}>
                      <input
                        type="text"
                        className="view-controller-instructions-form-input"
                        name="pickup"
                        value={formData.pickup || ""}
                        readOnly
                        style={{ ...nonEditableStyle, width: "100%", maxWidth: "75%" }}
                        placeholder="Pick-up location"
                      />
                    </div>
                  </div>
                  <div className="view-controller-instructions-form-field" style={{ flex: "1", minWidth: "0" }}>
                    <label>Drop-off Location</label>
                    <div className="view-controller-instructions-date-input-group" style={{ width: "100%" }}>
                      <input
                        type="text"
                        className="view-controller-instructions-form-input"
                        name="dropoff"
                        value={formData.dropoff || ""}
                        readOnly
                        style={{ ...nonEditableStyle, width: "100%", maxWidth: "75%" }}
                        placeholder="Drop-off location"
                      />
                    </div>
                  </div>
                </div>

                <div
                  className="view-controller-instructions-date-time-row-1"
                  style={{ marginTop: "15px", display: "flex", gap: "15px" }}
                >
                  <div className="view-controller-instructions-form-field" style={{ flex: "1", minWidth: "0" }}>
                    <label>Pick-up Time</label>
                    <div className="view-controller-instructions-date-input-group" style={{ width: "100%" }}>
                      <input
                        type="time"
                        className="view-controller-instructions-form-input"
                        placeholder="Time here"
                        name="pickupTime"
                        value={formData.pickupTime}
                        readOnly
                        style={{ ...nonEditableStyle, width: "100%" }}
                      />
                    </div>
                  </div>
                  <div className="view-controller-instructions-form-field" style={{ flex: "1", minWidth: "0" }}>
                    <label>Pick-up Date</label>
                    <div className="view-controller-instructions-date-input-group" style={{ width: "100%" }}>
                      <input
                        type="date"
                        className="view-controller-instructions-form-input"
                        placeholder="Date here"
                        name="pickupDate"
                        value={formData.pickupDate}
                        readOnly
                        style={{ ...nonEditableStyle, width: "100%" }}
                      />
                    </div>
                  </div>
                </div>

                <div className="view-controller-instructions-date-time-row-2" style={{ display: "flex", gap: "15px" }}>
                  {!isCrossHaulOrSpecial && (
                    <div className="view-controller-instructions-form-field" style={{ maxWidth: "200px" }}>
                      <label>Vessel Name</label>
                      <div className="view-controller-instructions-input-wrapper">
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
                  )}
                  {!isCrossHaulOrSpecial && (
                    <div className="view-controller-instructions-form-field" style={{ flex: "1", minWidth: "0" }}>
                      <label>{isImport ? "ETA" : "Stack Date"}</label>
                      <div className="view-controller-instructions-date-input-group" style={{ width: "100%" }}>
                        <input
                          type="date"
                          className="view-controller-instructions-form-input"
                          placeholder="Date here"
                          name="stackDate"
                          value={formData.stackDate}
                          readOnly
                          style={{ ...nonEditableStyle, width: "100%" }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="view-controller-instructions-form-field" style={{ flex: "1", minWidth: "0", maxWidth: "180px" }}>
                    <label>Deadline</label>
                    <div className="view-controller-instructions-date-input-group" style={{ width: "100%" }}>
                      <input
                        type="date"
                        className="view-controller-instructions-form-input"
                        placeholder="Date here"
                        name="deadline"
                        value={formData.deadline}
                        readOnly
                        style={{ ...nonEditableStyle, width: "100%" }}
                      />
                    </div>
                  </div>
                  <div className="view-controller-instructions-form-field" style={{ flex: "1", minWidth: "0" }}>
                    <label>Description from Client</label>
                    <div className="view-controller-instructions-input-wrapper">
                      <input
                        type="text"
                        className="view-controller-instructions-form-input"
                        placeholder="Description from Client"
                        name="description"
                        value={formData.description}
                        readOnly
                        style={nonEditableStyle}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>



        {/* Container Details Section */}
        <div className="view-controller-instructions-form-section" style={{ marginTop: '5px', padding: '15px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '600' }}>Container Details</h4>
          <div className="content" style={{ width: '100%', fontSize: '13px' }}>
            {isLoadingContainers ? (
              <div className="text-center p-2" style={{ fontSize: '13px' }}>
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-1 mb-0">Loading container data...</p>
              </div>
            ) : containers.length > 0 ? (
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse', 
                  backgroundColor: '#fff',
                  fontSize: '13px'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5ff' }}>
                      <th style={{ padding: '4px 6px', border: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600' }}>#</th>
                      <th style={{ padding: '4px 6px', border: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600' }}>Type</th>
                      <th style={{ padding: '4px 6px', border: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600' }}>Number</th>
                      {isImport && <th style={{ padding: '4px 6px', border: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600' }}>Weight</th>}
                      <th style={{ padding: '4px 6px', border: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600' }}>Cargo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {containers.map((container, index) => (
                      <tr key={container.id} style={{ 
                        backgroundColor: index % 2 === 1 ? '#f9f9f9' : '#fff',
                        fontSize: '13px',
                        lineHeight: '1.2'
                      }}>
                        <td style={{ padding: '4px 6px', border: '1px solid #eee' }}>{container.id}</td>
                        <td style={{ padding: '4px 6px', border: '1px solid #eee' }}>{container.containerType}</td>
                        <td style={{ padding: '4px 6px', border: '1px solid #eee' }}>
                          <input
                            type="text"
                            value={container.containerNum}
                            readOnly
                            style={{ 
                              ...nonEditableStyle, 
                              width: '100%', 
                              border: 'none', 
                              background: 'none',
                              padding: '2px 4px',
                              fontSize: '13px'
                            }}
                          />
                        </td>
                        {isImport && (
                          <td style={{ padding: '4px 6px', border: '1px solid #eee' }}>
                            <input
                              type="text"
                              value={container.weight}
                              readOnly
                              style={{ 
                                ...nonEditableStyle, 
                                width: '100%', 
                                border: 'none', 
                                background: 'none',
                                padding: '2px 4px',
                                fontSize: '13px'
                              }}
                            />
                          </td>
                        )}
                        <td style={{ padding: '4px 6px', border: '1px solid #eee' }}>
                          <input
                            type="text"
                            value={container.cargoDescription}
                            readOnly
                            style={{ 
                              ...nonEditableStyle, 
                              width: '100%', 
                              border: 'none', 
                              background: 'none',
                              padding: '2px 4px',
                              fontSize: '13px'
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="alert alert-info mb-0 py-1 px-2" style={{ fontSize: '13px' }}>
                No container details available for this instruction.
              </div>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Viewcontrollerinstructions
