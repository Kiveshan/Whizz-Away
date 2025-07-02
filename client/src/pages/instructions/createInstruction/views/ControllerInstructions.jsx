// "use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import "../../css/controllerinstruction.css"
import { useNavigate, useLocation } from "react-router-dom"
import api from "../../../../api"

const ControllerInstructions = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const isMounted = useRef(true)

  // Inline styles for the vessel name field
  const vesselNameStyles = {
    container: {
      width: "150px",
      minWidth: "150px",
      maxWidth: "150px",
      margin: "0",
      padding: "0",
      flex: "0 0 150px",
      position: "relative",
      zIndex: 1,
    },
    input: {
      width: "100%",
      minWidth: "100%",
      maxWidth: "100%",
      padding: "6px 8px",
      fontSize: "0.9rem",
      height: "32px",
      boxSizing: "border-box",
      margin: "0",
      display: "block",
      flex: "0 0 100%",
      border: "1px solid #ced4da",
      borderRadius: "4px",
    },
    label: {
      fontSize: "0.85rem",
      marginBottom: "4px",
      display: "block",
    },
    wrapper: {
      padding: "4px 0",
      width: "100%",
      margin: "0",
    },
  }

  // Memoize initial data to prevent recreation on re-renders
  const initialData = useMemo(
    () => ({
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
      num_breakbulk: 0,
      pickupTime: "",
      pickupDate: "",
      stackDate: "",
      deadline: "",
      fileRef: "",
      bookingRef: "",
      vesselName: "",
      rateWeight: "Container",
      weight: "",
      vat: 15,
      description: "",
      total_cost: 0,
      sixMeterRate: "",
      twelveMeterRate: "",
      abnormalRate: "",
      rateper_breakbulk: "",
      unitrate: "",
    }),
    [],
  )

  const preservedFormData = useMemo(() => location.state?.preservedFormData || null, [location.state])
  const containerCounts = useMemo(
    () =>
      location.state?.containerCounts || {
        "6m": 0,
        "12m": 0,
        Abnormal: 0,
        BreakBulk: 0,
      },
    [location.state],
  )

  console.log("ControllerInstructions received state:", location.state)
  console.log("ControllerInstructions - preservedFormData:", preservedFormData)
  console.log("ControllerInstructions - containerCounts:", containerCounts)

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
    sixMeterRate: useRef(null),
    twelveMeterRate: useRef(null),
    abnormalRate: useRef(null),
    weight: useRef(null),
    description: useRef(null),
    vesselName: useRef(null),
  }

  const [isImport, setIsImport] = useState(false)
  const [isWeightBased, setIsWeightBased] = useState(false)
  const [isCrossHaul, setIsCrossHaul] = useState(false)
  const today = new Date().toISOString().split("T")[0]

  // Form validation state
  const [fieldErrors, setFieldErrors] = useState({})
  const [containerFieldErrors, setContainerFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // State for client-specific locations
  const [clientStartingPoints, setClientStartingPoints] = useState([])
  const [clientDestinations, setClientDestinations] = useState([])
  const [isLoadingLocations, setIsLoadingLocations] = useState(false)
  const [locationError, setLocationError] = useState(null)
  const [showNoRatesModal, setShowNoRatesModal] = useState(false)
  const [weight, setWeight] = useState("")

  // Data loading states
  const [isLoading, setIsLoading] = useState({
    clients: true,
    shipmentTypes: true,
    startingPoints: true,
    destinations: true,
  })

  // Data states
  const [clients, setClients] = useState([])
  const [shipmentTypes, setShipmentTypes] = useState([])
  const [startingPoints, setStartingPoints] = useState([])
  const [destinations, setDestinations] = useState([])

  // Container states
  const [containers, setContainers] = useState([])
  const [showContainerDetails, setShowContainerDetails] = useState(false)

  // New state for rate locking
  const [rateLockStatus, setRateLockStatus] = useState({
    sixMeter: false,
    twelveMeter: false,
  })

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target

    // Special handling for IMO number (numbers only)
    if (name === "imoNo" && value !== "" && !/^\d*$/.test(value)) {
      return // Don't update if not a number
    }

    // Special handling for Flag Registration (letters and spaces only)
    if (name === "flagReg" && value !== "" && !/^[A-Za-z\s]*$/.test(value)) {
      return // Don't update if contains non-letter characters
    }

    // Update form data
    const newValue = type === "checkbox" ? checked : value
    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }))

    // Clear error when user starts typing and the field is no longer empty/invalid
    if (fieldErrors[name] && isFieldValid(name, newValue)) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  // Helper function to check if a field is valid
  const isFieldValid = (fieldName, value) => {
    switch (fieldName) {
      case "clientId":
      case "shipmentTypeId":
      case "task":
      case "pickup":
      case "dropoff":
      case "pickupTime":
      case "pickupDate":
      case "deadline":
      case "bookingRef":
      case "fileRef":
      case "description":
        return value && value.trim() !== ""
      case "stackDate":
        return !isCrossHaul ? value && value.trim() !== "" : true
      case "vesselName":
        return !isCrossHaul ? value && value.trim() !== "" : true
      case "weight":
      case "unitrate":
        return !isWeightBased || (value && value.trim() !== "")
      default:
        return true
    }
  }

  // Initialize containers based on counts while preserving existing container data
  const initializeContainers = (containerCounts = null) => {
    const counts = containerCounts || {
      num_six_meters: formData.num_six_meters || 0,
      num_twelve_meters: formData.num_twelve_meters || 0,
      num_abnormal: formData.num_abnormal || 0,
      num_breakbulk: formData.num_breakbulk || 0,
    }

    // Create a map of existing containers by type and index
    const existingContainersByType = {
      "6m": [],
      "12m": [],
      Abnormal: [],
      BreakBulk: [],
    }

    // Group existing containers by type
    containers.forEach((container) => {
      if (existingContainersByType[container.containerType]) {
        existingContainersByType[container.containerType].push(container)
      }
    })

    const containersList = []
    let containerId = 1

    // Helper function to get or create container
    const getOrCreateContainer = (type, index) => {
      const existing = existingContainersByType[type]
      if (index < existing.length) {
        // Use existing container if available
        return {
          ...existing[index],
          id: containerId++,
        }
      }
      // Create new container if needed
      return {
        id: containerId++,
        containerKey: null,
        containerNum: "",
        weight: isImport ? "" : null,
        containerType: type,
        cargoDescription: "",
      }
    }

    // Add 6m containers
    for (let i = 0; i < (counts.num_six_meters || 0); i++) {
      containersList.push(getOrCreateContainer("6m", i))
    }

    // Add 12m containers
    for (let i = 0; i < (counts.num_twelve_meters || 0); i++) {
      containersList.push(getOrCreateContainer("12m", i))
    }

    // Add abnormal containers
    for (let i = 0; i < (counts.num_abnormal || 0); i++) {
      containersList.push(getOrCreateContainer("Abnormal", i))
    }

    // Add break bulk containers for cross-haul
    // The break bulk counter and rate are always displayed for cross-haul,
    // but only contribute to container details if rateWeight is 'Container'.
    // So, we always add them here if cross-haul, and disable them later if not 'Container'.
    if (isCrossHaul) {
      for (let i = 0; i < (counts.num_breakbulk || 0); i++) {
        containersList.push(getOrCreateContainer("BreakBulk", i))
      }
    }

    setContainers(containersList)
    // Show container details if there are any containers AND it's not weight-based
    setShowContainerDetails(containersList.length > 0 && !isWeightBased)
  }

  // Handle container input changes
  const handleContainerChange = (id, field, value) => {
    if (field === "containerNum") {
      // Container number validation
      if (value.length > 11) return

      // First 4 letters, then 7 numbers
      let newValue = ""
      for (let i = 0; i < value.length; i++) {
        const char = value[i]
        if (i < 4) {
          if (/^[a-zA-Z]$/.test(char)) newValue += char
        } else if (/^[0-9]$/.test(char)) {
          newValue += char
        }
      }

      // Update field errors
      let error = null
      if (newValue.length > 0 && newValue.length < 11) {
        error = "Does not match correct format (ABCD1234567)"
      } else if (newValue.length === 11 && !/^[a-zA-Z]{4}[0-9]{7}$/.test(newValue)) {
        error = "Does not match correct format (ABCD1234567)"
      }

      setContainerFieldErrors((prev) => ({
        ...prev,
        [`container-${id}`]: error,
      }))

      value = newValue
    } else if (field === "weight" && value !== "") {
      // Only allow numbers and decimal point for weight
      if (!/^\d*\.?\d*$/.test(value)) return
    }

    // Update container
    setContainers((prev) =>
      prev.map((container) => (container.id === id ? { ...container, [field]: value } : container)),
    )
  }

  // Initialize form data with preserved data if available, or default values
  const [formData, setFormData] = useState(() => {
    console.log("Initializing form data with:", {
      preservedFormData,
      containerCounts,
      locationState: location.state,
    })

    // Default form data structure
    const defaultFormData = {
      // Client and basic info
      clientId: "",
      clientName: "",
      representative: "",
      contactDetails: "",
      email: "",
      task: "",
      shipmentTypeId: "",
      shipmentTypeName: "",

      // Location data
      startingPoints: [],
      destinations: [],
      selectedStartingPoint: "",
      selectedDestination: "",
      pickup: "",
      dropoff: "",

      // Other form fields
      hazardous: false,
      surcharges: false,
      surchargesAmount: "",
      pickupTime: "",
      pickupDate: "",
      stackDate: "",
      deadline: "",
      fileRef: "",
      bookingRef: "",
      vesselName: "",
      rateWeight: "Container",
      weight: "",
      vat: 15,
      description: "",
      rateper_6: "",
      rateper_12: "",
      abnormalRate: "",
      rateper_breakbulk: "",
      unitrate: "",
      num_six_meters: 0,
      num_twelve_meters: 0,
      num_abnormal: 0,
      num_breakbulk: 0,
      total_cost: 0,
      preserveSurcharges: false,
    }

    // If no preserved data, return defaults
    if (!preservedFormData && !location.state) {
      console.log("Using default form data")
      return defaultFormData
    }

    // Get location data from multiple possible sources with priority to location.state
    const locationData = {
      startingPoints: location.state?.startingPoints || preservedFormData?.startingPoints || [],
      destinations: location.state?.destinations || preservedFormData?.destinations || [],
      selectedStartingPoint:
        location.state?.selectedStartingPoint ||
        preservedFormData?.selectedStartingPoint ||
        preservedFormData?.pickup ||
        location.state?.pickup ||
        "",
      selectedDestination:
        location.state?.selectedDestination ||
        preservedFormData?.selectedDestination ||
        preservedFormData?.dropoff ||
        location.state?.dropoff ||
        "",
    }

    // Get container counts from multiple possible sources
    const containerCountsData = {
      num_six_meters: containerCounts?.["6m"] ?? preservedFormData?.num_six_meters ?? 0,
      num_twelve_meters: containerCounts?.["12m"] ?? preservedFormData?.num_twelve_meters ?? 0,
      num_abnormal: containerCounts?.["Abnormal"] ?? preservedFormData?.num_abnormal ?? 0,
      num_breakbulk: containerCounts?.["BreakBulk"] ?? preservedFormData?.num_breakbulk ?? 0,
    }

    console.log("Initializing with location data:", locationData)
    console.log("Initial container counts:", containerCountsData)

    // Log all potential data sources for debugging
    console.log("Data sources for form initialization:", {
      defaultFormData: { ...defaultFormData },
      preservedFormData: preservedFormData ? { ...preservedFormData } : null,
      controllerData: location.state?.controllerData ? { ...location.state.controllerData } : null,
      locationState: location.state ? { ...location.state } : null,
    })

    // Create form data with preserved values or fall back to defaults
    const formData = {
      // Start with default values
      ...defaultFormData,

      // Apply preserved form data (from sessionStorage or previous navigation)
      ...(preservedFormData || {}),

      // Then apply any controller data from location state (highest priority)
      ...(location.state?.controllerData || {}),

      // Apply location data with proper fallbacks
      startingPoints: Array.isArray(locationData.startingPoints) ? [...locationData.startingPoints] : [],
      destinations: Array.isArray(locationData.destinations) ? [...locationData.destinations] : [],
      selectedStartingPoint: locationData.selectedStartingPoint || "",
      selectedDestination: locationData.selectedDestination || "",

      // Apply container counts
      ...containerCountsData,

      // Explicitly set client data from controller data if available
      ...(location.state?.controllerData?.clientId && {
        clientId: location.state.controllerData.clientId,
        clientName: location.state.controllerData.clientName,
        representative: location.state.controllerData.representative,
        contactDetails: location.state.controllerData.contactDetails,
        email: location.state.controllerData.email,
      }),

      // Handle pickup and dropoff with multiple fallback sources
      pickup:
        preservedFormData?.pickup ||
        location.state?.pickup ||
        location.state?.controllerData?.pickup ||
        locationData.selectedStartingPoint ||
        locationData.pickup ||
        "",
      dropoff:
        preservedFormData?.dropoff ||
        location.state?.dropoff ||
        location.state?.controllerData?.dropoff ||
        locationData.selectedDestination ||
        locationData.dropoff ||
        "",

      // Other special cases
      hazardous: Boolean(preservedFormData?.hazardous || false),
      surcharges: Boolean(preservedFormData?.surcharges || false),
      vat: Number(preservedFormData?.vat) || 15,
      total_cost: Number(preservedFormData?.total_cost) || 0,
    }

    console.log("Form data initialized with locations:", {
      pickup: formData.pickup,
      dropoff: formData.dropoff,
      selectedStarting: formData.selectedStartingPoint,
      selectedDest: formData.selectedDestination,
      hasStartingPoints: formData.startingPoints?.length > 0,
      hasDestinations: formData.destinations?.length > 0,
    })

    console.log("Initialized form data:", formData)
    return formData
  })

  // Update unit type and cross-haul states when form data changes
  useEffect(() => {
    const weightBasedUnits = ["kg", "mÂ³", "ton"]
    setIsWeightBased(weightBasedUnits.includes(formData.rateWeight))
    setIsCrossHaul(formData.shipmentTypeId === "3")
    setIsImport(formData.shipmentTypeId === "1")
  }, [formData.rateWeight, formData.shipmentTypeId])

  // Debug effect to log form data changes
  useEffect(() => {
    console.log("Form Data Updated:", {
      // Surcharge related fields
      surcharges: formData.surcharges,
      surchargesAmount: formData.surchargesAmount,
      preserveSurcharges: formData.preserveSurcharges,
      // Rate fields
      sixMeterRate: formData.sixMeterRate,
      twelveMeterRate: formData.twelveMeterRate,
      // Client and location
      clientId: formData.clientId,
      pickup: formData.pickup,
      dropoff: formData.dropoff,
      // Unit type states
      isWeightBased: isWeightBased,
      isCrossHaul: isCrossHaul,
    })
  }, [formData, isWeightBased, isCrossHaul])

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load clients
        const clientsResponse = await api.get("/api/instructions/active-clients")
        setClients(clientsResponse.data)
        setIsLoading((prev) => ({ ...prev, clients: false }))

        // Load shipment types
        const shipmentTypesResponse = await api.get("/api/instructions/shipment-types")
        setShipmentTypes(shipmentTypesResponse.data)
        setIsLoading((prev) => ({ ...prev, shipmentTypes: false }))

        // Set other loading states to false since we're not loading them initially
        setIsLoading((prev) => ({
          ...prev,
          startingPoints: false,
          destinations: false,
        }))
      } catch (error) {
        console.error("Error loading initial data:", error)
        setIsLoading({
          clients: false,
          shipmentTypes: false,
          startingPoints: false,
          destinations: false,
        })
      }
    }

    loadInitialData()
  }, [])

  // Get rate values from formData
  const sixMeterRate = formData.sixMeterRate || ""
  const twelveMeterRate = formData.twelveMeterRate || ""
  const abnormalRate = formData.abnormalRate || ""

  // Function to fetch rates for the selected client, pickup and dropoff
  const fetchRates = useCallback(async (clientId, start, destination) => {
    if (!clientId || !start || !destination) {
      console.log("[fetchRates] Missing required parameters:", { clientId, start, destination })
      return null
    }

    const url = `/api/instructions/client/${clientId}/rates`
    const params = { start, destination }

    console.log("[fetchRates] Making request to:", url, "with params:", params)

    try {
      const response = await api.get(url, { params })

      console.log("[fetchRates] Response received:", {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers,
      })

      return response.data
    } catch (error) {
      console.error("[fetchRates] Error fetching rates:", {
        message: error.message,
        response: error.response
          ? {
              status: error.response.status,
              statusText: error.response.statusText,
              data: error.response.data,
              headers: error.response.headers,
            }
          : "No response",
        request: error.request,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          params: error.config?.params,
          headers: error.config?.headers,
        },
        stack: error.stack,
      })
      return null
    }
  }, [])

  // Track previous values to prevent unnecessary updates
  const prevValuesRef = useRef({
    pickup: formData.pickup,
    dropoff: formData.client,
    client: formData.client,
  })

  // Memoize the fetchRates function to prevent recreation
  const memoizedFetchRates = useCallback(fetchRates, [])

  // Update rates when pickup or dropoff changes (only for container-based calculations)
  useEffect(() => {
    console.log("=== RATE FETCHING EFFECT TRIGGERED ===")
    console.log("Current form data:", {
      clientId: formData.clientId,
      pickup: formData.pickup,
      dropoff: formData.dropoff,
      num_six_meters: formData.num_six_meters,
      num_twelve_meters: formData.num_twelve_meters,
      num_abnormal: formData.num_abnormal,
      isWeightBased: isWeightBased,
    })

    // Skip rate fetching for weight-based calculations
    if (isWeightBased) {
      console.log("Skipping rate fetch for weight-based calculation")
      // Also reset rate lock status when switching to weight-based
      setRateLockStatus({ sixMeter: false, twelveMeter: false })
      return
    }

    const { pickup, dropoff, clientId } = formData

    // Check if we have all required fields
    if (!clientId || !pickup || !dropoff) {
      console.log("Missing required fields for rate fetching:", {
        hasClientId: !!clientId,
        hasPickup: !!pickup,
        hasDropoff: !!dropoff,
      })
      // Clear rates and unlock fields if conditions are not met
      setFormData((prev) => ({
        ...prev,
        sixMeterRate: "",
        twelveMeterRate: "",
        abnormalRate: "",
        rateper_breakbulk: "",
        surchargesAmount: "",
      }))
      setRateLockStatus({ sixMeter: false, twelveMeter: false })
      return
    }

    console.log("All required fields present, proceeding to fetch rates...")

    const fetchAndUpdateRates = async () => {
      try {
        console.log("Calling memoizedFetchRates with:", { clientId, pickup, dropoff })
        const rates = await memoizedFetchRates(clientId, pickup, dropoff)

        console.log("Rates received from API:", rates)

        setFormData((prev) => {
          const updates = { ...prev }
          const newRateLockStatus = { sixMeter: false, twelveMeter: false }

          if (rates) {
            console.log("Updating form data with new rates:", rates)

            // Update 6m rate and lock status
            if (rates.sixMeterRate != null && Number.parseFloat(rates.sixMeterRate) > 0) {
              updates.sixMeterRate = Number.parseFloat(rates.sixMeterRate).toFixed(2)
              newRateLockStatus.sixMeter = true
            } else {
              updates.sixMeterRate = "" // Clear if null/undefined/0
              newRateLockStatus.sixMeter = false // Ensure it's editable
            }

            // Update 12m rate and lock status
            if (rates.twelveMeterRate != null && Number.parseFloat(rates.twelveMeterRate) > 0) {
              updates.twelveMeterRate = Number.parseFloat(rates.twelveMeterRate).toFixed(2)
              newRateLockStatus.twelveMeter = true
            } else {
              updates.twelveMeterRate = "" // Clear if null/undefined/0
              newRateLockStatus.twelveMeter = false // Ensure it's editable
            }

            // Abnormal rate is always editable if count > 0, so no locking based on DB
            if (rates.abnormalRate != null) {
              updates.abnormalRate = Number.parseFloat(rates.abnormalRate).toFixed(2)
            } else {
              updates.abnormalRate = ""
            }

            // Break bulk rate is always editable if count > 0, so no locking based on DB
            if (rates.rateper_breakbulk != null) {
              updates.rateper_breakbulk = Number.parseFloat(rates.rateper_breakbulk).toFixed(2)
            } else {
              updates.rateper_breakbulk = ""
            }

            // Handle surcharges - only set the amount, don't auto-check the box
            if (rates.surcharges !== undefined) {
              console.log("Processing surcharges:", rates.surcharges)
              const surchargesNum = Number.parseFloat(rates.surcharges)
              const hasSurcharges = !isNaN(surchargesNum) && surchargesNum > 0

              // Only set the amount, don't change the surcharges checkbox state here
              updates.surchargesAmount = hasSurcharges ? surchargesNum.toString() : ""
              updates.surcharges = hasSurcharges // Auto-check if there's a value from DB
              updates.preserveSurcharges = hasSurcharges

              console.log("Updated surcharge values (checkbox state unchanged):", {
                surcharges: updates.surcharges,
                surchargesAmount: updates.surchargesAmount,
                preserveSurcharges: updates.preserveSurcharges,
              })
            }
          } else {
            console.log("No rates found for client, clearing all rate fields and unlocking")
            // Clear all rate fields when no rates are found
            updates.sixMeterRate = ""
            updates.twelveMeterRate = ""
            updates.abnormalRate = ""
            updates.rateper_breakbulk = ""
            updates.surchargesAmount = ""
            updates.surcharges = false // Uncheck surcharges if no rates
            newRateLockStatus.sixMeter = false
            newRateLockStatus.twelveMeter = false
          }

          setRateLockStatus(newRateLockStatus)
          return updates
        })
      } catch (error) {
        console.error("Error in fetchAndUpdateRates:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        })
        // Clear rates and unlock fields on error
        setFormData((prev) => ({
          ...prev,
          sixMeterRate: "",
          twelveMeterRate: "",
          abnormalRate: "",
          rateper_breakbulk: "",
          surchargesAmount: "",
          surcharges: false,
        }))
        setRateLockStatus({ sixMeter: false, twelveMeter: false })
      }
    }

    fetchAndUpdateRates()
  }, [formData.clientId, formData.pickup, formData.dropoff, memoizedFetchRates, isWeightBased])

  // Track which rate fields should be enabled
  const [rateFieldsEnabled, setRateFieldsEnabled] = useState({
    sixMeter: false,
    twelveMeter: false,
    abnormal: false,
  })

  // Update rate fields enabled state when container counts change
  useEffect(() => {
    const sixMeterEnabled = formData.num_six_meters > 0
    const twelveMeterEnabled = formData.num_twelve_meters > 0
    const abnormalEnabled = formData.num_abnormal > 0

    const newState = {
      sixMeter: sixMeterEnabled,
      twelveMeter: twelveMeterEnabled,
      abnormal: abnormalEnabled,
    }

    console.log("Container counts:", {
      sixMeter: formData.num_six_meters,
      twelveMeter: formData.num_twelve_meters,
      abnormal: formData.num_abnormal,
      breakbulk: formData.num_breakbulk,
      sixMeterRate: formData.sixMeterRate,
      twelveMeterRate: formData.twelveMeterRate,
      abnormalRate: formData.abnormalRate,
    })

    // Only update state if it has changed
    if (JSON.stringify(rateFieldsEnabled) !== JSON.stringify(newState)) {
      console.log("Updating rate fields enabled state:", newState)
      setRateFieldsEnabled(newState)
    }
  }, [
    formData.num_six_meters,
    formData.num_twelve_meters,
    formData.num_abnormal,
    formData.sixMeterRate,
    formData.twelveMeterRate,
    formData.abnormalRate,
    rateFieldsEnabled,
  ])

  // Handle client selection
  const handleClientChange = async (e) => {
    const clientId = e.target.value
    const selectedClient = clients.find((client) => client.m5clientkey === clientId)

    console.log("Client selected:", clientId)
    console.log("Found selectedClient:", selectedClient)
    console.log("Representative:", selectedClient?.representative)
    console.log("Contact Details (cellnum):", selectedClient?.cellnum)
    console.log("Email:", selectedClient?.email)

    setFormData((prev) => ({
      ...prev,
      clientId: clientId,
      clientName: selectedClient?.companyname || "",
      representative: selectedClient?.representative || "",
      contactDetails: selectedClient?.cellnum || "",
      email: selectedClient?.email || "",
      // Reset location-related fields when client changes
      pickup: "",
      dropoff: "",
      selectedStartingPoint: "",
      selectedDestination: "",
      // Reset rates and lock status when client changes
      sixMeterRate: "",
      twelveMeterRate: "",
      abnormalRate: "",
      rateper_breakbulk: "",
      surchargesAmount: "",
      surcharges: false, // Uncheck surcharges when client changes
    }))
    setRateLockStatus({ sixMeter: false, twelveMeter: false })

    // Clear any existing errors
    setFieldErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors.clientId
      return newErrors
    })

    // Load starting points for the selected client
    if (clientId) {
      setIsLoadingLocations(true)
      try {
        const response = await api.get(`/api/instructions/client/${clientId}/starting-points`)
        const startingPoints = response.data.map((point) => ({
          value: point.starting_point,
          label: point.starting_point,
        }))
        setClientStartingPoints(startingPoints)
        setFormData((prev) => ({ ...prev, startingPoints }))
      } catch (error) {
        console.error("Error loading starting points:", error)
        setClientStartingPoints([])
        if (error.response?.status === 404) {
          setShowNoRatesModal(true)
        }
      } finally {
        setIsLoadingLocations(false)
      }
    } else {
      setClientStartingPoints([])
      setClientDestinations([])
    }
  }

  // Handle pickup location change
  const handlePickupChange = async (e) => {
    const pickup = e.target.value
    setFormData((prev) => ({
      ...prev,
      pickup: pickup,
      selectedStartingPoint: pickup,
      // Reset destination when pickup changes
      dropoff: "",
      selectedDestination: "",
      // Reset rates and lock status when pickup changes
      sixMeterRate: "",
      twelveMeterRate: "",
      abnormalRate: "",
      rateper_breakbulk: "",
      surchargesAmount: "",
      surcharges: false, // Uncheck surcharges when pickup changes
    }))
    setRateLockStatus({ sixMeter: false, twelveMeter: false })

    // Clear any existing errors
    setFieldErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors.pickup
      return newErrors
    })

    // Load destinations for the selected pickup
    if (pickup && formData.clientId) {
      setIsLoading((prev) => ({ ...prev, destinations: true }))
      try {
        const response = await api.get(`/api/instructions/client/${formData.clientId}/destinations/${pickup}`)
        const destinations = response.data.map((dest) => ({
          value: dest.destination,
          label: dest.destination,
        }))
        setClientDestinations(destinations)
        setFormData((prev) => ({ ...prev, destinations }))
      } catch (error) {
        console.error("Error loading destinations:", error)
        setClientDestinations([])
      } finally {
        setIsLoading((prev) => ({ ...prev, destinations: false }))
      }
    } else {
      setClientDestinations([])
    }
  }

  // Handle dropoff location change
  const handleDropoffChange = (e) => {
    const dropoff = e.target.value
    setFormData((prev) => ({
      ...prev,
      dropoff: dropoff,
      selectedDestination: dropoff,
      // Reset rates and lock status when dropoff changes
      sixMeterRate: "",
      twelveMeterRate: "",
      abnormalRate: "",
      rateper_breakbulk: "",
      surchargesAmount: "",
      surcharges: false, // Uncheck surcharges when dropoff changes
    }))
    setRateLockStatus({ sixMeter: false, twelveMeter: false })

    // Clear any existing errors
    setFieldErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors.dropoff
      return newErrors
    })
  }

  // Handle shipment type change
  const handleShipmentTypeChange = (e) => {
    const shipmentTypeId = e.target.value
    const selectedType = shipmentTypes.find((type) => type.shipkey === shipmentTypeId)

    setFormData((prev) => ({
      ...prev,
      shipmentTypeId: shipmentTypeId,
      shipmentTypeName: selectedType?.shipmenttype || "",
      // Set vessel_name and stackDate to null for cross-haul
      ...(shipmentTypeId === "3" && {
        vesselName: "",
        stackDate: "",
      }),
    }))

    // Clear any existing errors
    setFieldErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors.shipmentTypeId
      return newErrors
    })
  }

  // Handle container count changes
  const handleContainerCountChange = (field, value) => {
    const numValue = Number.parseInt(value, 10) || 0
    setFormData((prev) => ({
      ...prev,
      [field]: numValue,
    }))

    // Update containers when counts change
    // This logic needs to be careful not to re-initialize containers if it's weight-based,
    // even if break bulk is displayed.
    if (formData.rateWeight === "Container") {
      const newCounts = {
        num_six_meters: field === "num_six_meters" ? numValue : formData.num_six_meters,
        num_twelve_meters: field === "num_twelve_meters" ? numValue : formData.num_twelve_meters,
        num_abnormal: field === "num_abnormal" ? numValue : formData.num_abnormal,
        num_breakbulk: field === "num_breakbulk" ? numValue : formData.num_breakbulk,
      }
      initializeContainers(newCounts)
    }
  }

  // Calendar helper function
  const openCalendar = (ref) => {
    if (ref.current) {
      ref.current.showPicker()
    }
  }

  // Form validation
  const validateForm = () => {
    const errors = {}

    // Required fields
    if (!formData.clientId) errors.clientId = "Client is required"
    if (!formData.shipmentTypeId) errors.shipmentTypeId = "Shipment type is required"
    if (!formData.task) errors.task = "Task is required"
    if (!formData.pickup) errors.pickup = "Pickup location is required"
    if (!formData.dropoff) errors.dropoff = "Dropoff location is required"
    if (!formData.pickupTime) errors.pickupTime = "Pickup time is required"
    if (!formData.pickupDate) errors.pickupDate = "Pickup date is required"
    if (!formData.deadline) errors.deadline = "Deadline is required"
    if (!formData.bookingRef) errors.bookingRef = "Booking reference is required"
    if (!formData.fileRef) errors.fileRef = "File reference is required"
    if (!formData.description) errors.description = "Description is required"

    // Cross-haul specific validations (vessel name and stack date not required)
    if (!isCrossHaul) {
      if (!formData.vesselName) errors.vesselName = "Vessel name is required"
      if (!formData.stackDate) errors.stackDate = "Stack date is required"
    }

    // Weight-based validations
    if (isWeightBased) {
      if (!formData.weight || formData.weight === "") {
        errors.weight = "Weight is required for weight-based calculations"
      }
      if (!formData.unitrate || formData.unitrate === "") {
        errors.unitrate = "Unit rate is required for weight-based calculations"
      }
    } else {
      // Container-based validations
      const totalContainers =
        formData.num_six_meters +
        formData.num_twelve_meters +
        formData.num_abnormal +
        (isCrossHaul && formData.rateWeight === "Container" ? formData.num_breakbulk : 0) // Only count breakbulk if it's container-based
      if (totalContainers === 0) {
        errors.containerCount = "At least one container is required"
      }

      // Break bulk validation for cross-haul + container
      if (isCrossHaul && formData.num_breakbulk > 0 && formData.rateWeight === "Container") {
        if (!formData.rateper_breakbulk || formData.rateper_breakbulk === "") {
          errors.rateper_breakbulk = "Break bulk rate is required when break bulk count > 0 and unit type is Container"
        }
      }
    }

    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate form fields
    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setIsSubmitting(true)
    setSubmitError("")

    try {
      let totalCost = 0

      if (isWeightBased) {
        // Weight-based calculation
        const weight = Number.parseFloat(formData.weight || 0)
        const unitRate = Number.parseFloat(formData.unitrate || 0)
        totalCost = weight * unitRate
      } else {
        // Container-based calculation
        const sixMeterCost = (Number.parseFloat(formData.sixMeterRate) || 0) * (formData.num_six_meters || 0)
        const twelveMeterCost = (Number.parseFloat(formData.twelveMeterRate) || 0) * (formData.num_twelve_meters || 0)
        const abnormalCost = (Number.parseFloat(formData.abnormalRate) || 0) * (formData.num_abnormal || 0)
        // Break bulk cost only applies if it's cross-haul AND the rateWeight is 'Container'
        const breakBulkCost =
          isCrossHaul && formData.rateWeight === "Container"
            ? (Number.parseFloat(formData.rateper_breakbulk) || 0) * (formData.num_breakbulk || 0)
            : 0

        totalCost = sixMeterCost + twelveMeterCost + abnormalCost + breakBulkCost
      }

      // Add surcharges
      const surchargeAmount = formData.surcharges ? Number.parseFloat(formData.surchargesAmount || 0) : 0
      const subtotal = totalCost + surchargeAmount
      const vatAmount = subtotal * (formData.vat / 100)
      totalCost = subtotal + vatAmount

      // Prepare instruction data with null values for cross-haul and weight-based
      const instructionData = {
        ...formData,
        total_cost: totalCost,
        // Set vessel_name and stackdate to null for cross-haul
        vessel_name: isCrossHaul ? null : formData.vesselName,
        stackdate: isCrossHaul ? null : formData.stackDate,
        // Set container rates to null for weight-based
        rateper_6: isWeightBased
          ? null
          : formData.sixMeterRate === ""
            ? null
            : Number.parseFloat(formData.sixMeterRate || 0),
        rateper_12: isWeightBased
          ? null
          : formData.twelveMeterRate === ""
            ? null
            : Number.parseFloat(formData.twelveMeterRate || 0),
        rateper_abnormal: isWeightBased
          ? null
          : formData.abnormalRate === ""
            ? null
            : Number.parseFloat(formData.abnormalRate || 0),
        // Break bulk rate is null if weight-based OR not cross-haul OR not container unit type
        rateper_breakbulk:
          isWeightBased || !isCrossHaul || formData.rateWeight !== "Container"
            ? null
            : formData.rateper_breakbulk === ""
              ? null
              : Number.parseFloat(formData.rateper_breakbulk || 0),
        // Set container counts to 0 for weight-based
        num_six_meters: isWeightBased ? 0 : formData.num_six_meters || 0,
        num_twelve_meters: isWeightBased ? 0 : formData.num_twelve_meters || 0,
        num_abnormal: isWeightBased ? 0 : formData.num_abnormal || 0,
        // Break bulk count is 0 if weight-based OR not cross-haul OR not container unit type
        num_breakbulk:
          isWeightBased || !isCrossHaul || formData.rateWeight !== "Container" ? 0 : formData.num_breakbulk || 0,
        // Set weight and unitrate appropriately
        weight: isWeightBased ? (formData.weight === "" ? null : Number.parseFloat(formData.weight || 0)) : null,
        unitrate: isWeightBased ? (formData.unitrate === "" ? null : Number.parseFloat(formData.unitrate || 0)) : null,
        // Map field names for backend
        client: formData.clientId,
        shipment_type: formData.shipmentTypeId,
        pickuptime: formData.pickupTime,
        pickupdate: formData.pickupDate,
        deadline: formData.deadline,
        fileref: formData.fileRef,
        booking_ref: formData.bookingRef,
        rateweight: formData.rateWeight,
        status: "New",
        vat: formData.vat,
        surchages: formData.surcharges,
        surcharge: surchargeAmount,
      }

      // Prepare container data (only for container-based calculations AND if unit type is Container)
      const containerData =
        !isWeightBased && formData.rateWeight === "Container"
          ? containers.map((container) => ({
              container_type: container.containerType,
              containerNum: container.containerNum,
              weight: isImport ? (container.weight === "" ? null : Number.parseFloat(container.weight || 0)) : null,
              cargo_description: container.cargoDescription || "",
            }))
          : []

      console.log("Submitting instruction data:", instructionData)
      console.log("Submitting container data:", containerData)
      console.log("Total cost calculation:", {
        subtotal,
        surcharge: surchargeAmount,
        total: totalCost,
      })

      // Save the instruction
      const response = await api.post("/api/instructions/save-instruction", {
        controllerData: instructionData,
        containerData: containerData,
      })

      if (response.data.success) {
        // Navigate to dashboard on success
        navigate("/ControllerDashboard")
      } else {
        throw new Error(response.data.message || "Failed to save instruction")
      }
    } catch (error) {
      console.error("Error submitting form:", error)
      setSubmitError(error.response?.data?.message || error.message || "An error occurred while saving the instruction")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ErrorTooltip component - Disabled
  const ErrorTooltip = () => null

  // Style objects
  const nonEditableStyle = {
    backgroundColor: "#f5f5f5",
    cursor: "not-allowed",
  }

  const disabledRateStyle = {
    backgroundColor: "#f5f5f5",
    color: "rgba(0, 0, 0, 0.38)",
    cursor: "not-allowed",
  }

  // Spinner styles
  const spinnerKeyframes = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `

  // Determine if break bulk fields should be disabled
  const disableBreakBulkFields = formData.rateWeight !== "Container" || !isCrossHaul

  return (
    <div className="controller-instructions-unique-wrapper">
      <style>{spinnerKeyframes}</style>

      {/* No Rates Modal */}
      {showNoRatesModal && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="modal"
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
              maxWidth: "500px",
              width: "90%",
            }}
          >
            <h3 style={{ marginTop: 0 }}>No Rates Available</h3>
            <p>This client has no rates configured. Please contact the manager to set up rates.</p>
            <button
              style={{
                padding: "8px 16px",
                backgroundColor: "#4a90e2",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                marginTop: "10px",
              }}
              onClick={() => setShowNoRatesModal(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div className="controller-instructions-header">
        <button className="controller-instructions-back-button" onClick={() => navigate("/ControllerDashboard")}>
          Back
        </button>
      </div>

      {/* Loading state removed as per requirements */}
      {isLoadingLocations && <div style={{ height: "20px" }}></div>}

      {/* Location error popup removed as per requirements */}
      {isLoading.clients || isLoading.shipmentTypes || isLoading.startingPoints || isLoading.destinations ? (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <p>Loading data...</p>
        </div>
      ) : clients.length === 0 || shipmentTypes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <p>Failed to load data from the database. Please try again.</p>
          <button
            onClick={() => window.location.reload()}
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
      <form
        onSubmit={handleSubmit}
        className="controller-instructions-form-container"
        style={{ maxWidth: "1200px", width: "calc(100% - 40px)", margin: "0 auto", boxSizing: "border-box" }}
      >
        <div className="controller-instructions-form-section controller-instructions-client-info-section">
          <div className="controller-instructions-form-row">
            <div className="controller-instructions-form-field">
              <label>Client</label>
              <div className="controller-instructions-select-wrapper" ref={fieldRefs.clientId}>
                <select
                  className={`dropdown ${fieldErrors.clientId ? "controller-instructions-error-field" : ""}`}
                  name="clientId"
                  value={formData.clientId}
                  onChange={handleClientChange}
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
                <ErrorTooltip message={fieldErrors.clientId} />
              </div>
            </div>
            <div className="controller-instructions-form-field">
              <label>Pick-Up Location</label>
              <div className="controller-instructions-select-wrapper" ref={fieldRefs.pickup}>
                <select
                  className={`dropdown ${fieldErrors.pickup ? "controller-instructions-error-field" : ""}`}
                  name="pickup"
                  value={formData.pickup}
                  onChange={handlePickupChange}
                  disabled={!formData.clientId || isLoadingLocations}
                >
                  <option value="" disabled>
                    Select Pick-Up Location
                  </option>
                  {Array.isArray(clientStartingPoints) &&
                    clientStartingPoints.map((location, index) => (
                      <option key={index} value={location.value}>
                        {location.label}
                      </option>
                    ))}
                </select>
                <ErrorTooltip message={fieldErrors.pickup} />
              </div>
            </div>
            <div className="controller-instructions-form-field">
              <label>Drop-Off Location</label>
              <div className="controller-instructions-select-wrapper" ref={fieldRefs.dropoff}>
                <select
                  name="dropoff"
                  value={formData.dropoff}
                  onChange={handleDropoffChange}
                  disabled={!formData.clientId || !formData.pickup || isLoading.destinations}
                  className={
                    !formData.clientId || !formData.pickup
                      ? "controller-instructions-form-input disabled-field"
                      : "controller-instructions-form-input"
                  }
                >
                  {!formData.clientId || !formData.pickup ? (
                    <option value="">Please select client and pickup first</option>
                  ) : (
                    <option value="">Select Destination</option>
                  )}
                  {Array.isArray(clientDestinations) &&
                    clientDestinations.map((location, index) => (
                      <option key={index} value={location.value}>
                        {location.label}
                      </option>
                    ))}
                </select>
                <ErrorTooltip message={fieldErrors.dropoff} />
              </div>
            </div>
            <div className="controller-instructions-form-field">
              <label>Representative</label>
              <input
                type="text"
                className="controller-instructions-form-input"
                name="representative"
                value={formData.representative}
                readOnly
                style={nonEditableStyle}
              />
            </div>
            <div className="controller-instructions-form-field">
              <label>Contact Details</label>
              <input
                type="text"
                className="controller-instructions-form-input"
                name="contactDetails"
                value={formData.contactDetails}
                readOnly
                style={nonEditableStyle}
              />
            </div>
            <div className="controller-instructions-form-field">
              <label>Email</label>
              <input
                type="email"
                className="controller-instructions-form-input"
                name="email"
                value={formData.email}
                readOnly
                style={nonEditableStyle}
              />
            </div>
          </div>
        </div>
        <div className="controller-instructions-form-section">
          <div className="controller-instructions-form-row" style={{ display: "none" }}>
            <div className="controller-instructions-form-field">
              <label>Shipment Type</label>
              <div className="controller-instructions-select-wrapper" ref={fieldRefs.shipmentTypeId}>
                <select
                  className={`dropdown ${fieldErrors.shipmentTypeId ? "controller-instructions-error-field" : ""}`}
                  name="shipmentTypeId"
                  value={formData.shipmentTypeId}
                  onChange={handleShipmentTypeChange}
                  disabled={isLoading.shipmentTypes || shipmentTypes.length === 0}
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
                <ErrorTooltip message={fieldErrors.shipmentTypeId} />
              </div>
            </div>
            <div className="controller-instructions-form-field">
              <label>Name of Task</label>
              <div className="controller-instructions-input-wrapper" ref={fieldRefs.task}>
                <input
                  type="text"
                  className={`controller-instructions-form-input ${fieldErrors.task ? "controller-instructions-error-field" : ""}`}
                  placeholder="Input Name of Task"
                  name="task"
                  value={formData.task}
                  onChange={handleInputChange}
                />
                <ErrorTooltip message={fieldErrors.task} />
              </div>
            </div>
          </div>
        </div>
        <div className="controller-instructions-form-section">
          <div className="controller-instructions-form-row controller-instructions-trailer-container">
            <div className="controller-instructions-container-section">
              <div className="controller-instructions-container-group">
                <div className="controller-instructions-container-label">
                  <span className="controller-instructions-trailer-size-label">Trailer Size</span>
                  <label>No. of Containers</label>
                  {fieldErrors.containers && (
                    <div className="controller-instructions-container-error-message">{fieldErrors.containers}</div>
                  )}
                </div>
                <div
                  className="controller-instructions-container-inputs"
                  style={{
                    opacity: isWeightBased ? 0.5 : 1,
                    pointerEvents: isWeightBased ? "none" : "auto",
                  }}
                >
                  <div className="controller-instructions-container-input">
                    <label>6m</label>
                    <div className="controller-instructions-container-rate-group">
                      <input
                        type="number"
                        className={fieldErrors.containers ? "controller-instructions-error-field" : ""}
                        value={formData.num_six_meters}
                        min="0"
                        name="num_six_meters"
                        onChange={(e) => handleContainerCountChange("num_six_meters", e.target.value)}
                        disabled={isWeightBased}
                      />
                      <div style={{ width: "100%" }}>
                        <input
                          type="text"
                          value={
                            formData.sixMeterRate !== undefined && formData.sixMeterRate !== ""
                              ? Number.parseFloat(formData.sixMeterRate).toFixed(2)
                              : ""
                          }
                          onChange={(e) => {
                            const value = e.target.value
                            // Allow numbers, decimal point, and empty string
                            if (value === "" || /^\d*\.?\d*$/.test(value)) {
                              setFormData((prev) => ({
                                ...prev,
                                sixMeterRate: value === "" ? "" : Number.parseFloat(value) || 0,
                              }))
                            }
                          }}
                          onFocus={(e) => {
                            e.target.select()
                            // Show raw value when focused for editing
                            if (formData.sixMeterRate) {
                              setFormData((prev) => ({
                                ...prev,
                                sixMeterRate: Number.parseFloat(prev.sixMeterRate).toString(),
                              }))
                            }
                          }}
                          onBlur={() => {
                            // Format to 2 decimal places when focus is lost
                            if (formData.sixMeterRate !== "") {
                              setFormData((prev) => ({
                                ...prev,
                                sixMeterRate: Number.parseFloat(prev.sixMeterRate),
                              }))
                            }
                          }}
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "1px solid #000",
                            borderRadius: "4px",
                            backgroundColor:
                              rateFieldsEnabled.sixMeter && !isWeightBased && !rateLockStatus.sixMeter
                                ? "#fff"
                                : "#f5f5f5",
                            fontSize: "16px",
                            position: "relative",
                            zIndex: 1000,
                            cursor:
                              rateFieldsEnabled.sixMeter && !isWeightBased && !rateLockStatus.sixMeter
                                ? "text"
                                : "not-allowed",
                          }}
                          disabled={!rateFieldsEnabled.sixMeter || isWeightBased || rateLockStatus.sixMeter}
                          placeholder={
                            rateFieldsEnabled.sixMeter && !isWeightBased && !rateLockStatus.sixMeter ? "0.00" : ""
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div className="controller-instructions-container-input">
                    <label>12m</label>
                    <div className="controller-instructions-container-rate-group">
                      <input
                        type="number"
                        className={fieldErrors.containers ? "controller-instructions-error-field" : ""}
                        value={formData.num_twelve_meters}
                        min="0"
                        name="num_twelve_meters"
                        onChange={(e) => handleContainerCountChange("num_twelve_meters", e.target.value)}
                        disabled={isWeightBased}
                      />
                      <div style={{ width: "100%" }}>
                        <input
                          type="text"
                          value={
                            formData.twelveMeterRate !== undefined && formData.twelveMeterRate !== ""
                              ? Number.parseFloat(formData.twelveMeterRate).toFixed(2)
                              : ""
                          }
                          onChange={(e) => {
                            const value = e.target.value
                            if (value === "" || /^\d*\.?\d*$/.test(value)) {
                              setFormData((prev) => ({
                                ...prev,
                                twelveMeterRate: value === "" ? "" : Number.parseFloat(value) || 0,
                              }))
                            }
                          }}
                          onFocus={(e) => {
                            e.target.select()
                            if (formData.twelveMeterRate) {
                              setFormData((prev) => ({
                                ...prev,
                                twelveMeterRate: Number.parseFloat(prev.twelveMeterRate).toString(),
                              }))
                            }
                          }}
                          onBlur={() => {
                            if (formData.twelveMeterRate !== "") {
                              setFormData((prev) => ({
                                ...prev,
                                twelveMeterRate: Number.parseFloat(prev.twelveMeterRate),
                              }))
                            }
                          }}
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "1px solid #000",
                            borderRadius: "4px",
                            backgroundColor:
                              rateFieldsEnabled.twelveMeter && !isWeightBased && !rateLockStatus.twelveMeter
                                ? "#fff"
                                : "#f5f5f5",
                            cursor:
                              rateFieldsEnabled.twelveMeter && !isWeightBased && !rateLockStatus.twelveMeter
                                ? "text"
                                : "not-allowed",
                          }}
                          disabled={!rateFieldsEnabled.twelveMeter || isWeightBased || rateLockStatus.twelveMeter}
                          placeholder={
                            rateFieldsEnabled.twelveMeter && !isWeightBased && !rateLockStatus.twelveMeter ? "0.00" : ""
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div className="controller-instructions-container-input">
                    <label>Abnormal</label>
                    <div className="controller-instructions-container-rate-group">
                      <input
                        type="number"
                        className={fieldErrors.containers ? "controller-instructions-error-field" : ""}
                        value={formData.num_abnormal}
                        min="0"
                        name="num_abnormal"
                        onChange={(e) => handleContainerCountChange("num_abnormal", e.target.value)}
                        disabled={isWeightBased}
                      />
                      <div style={{ width: "100%" }}>
                        <input
                          type="text"
                          value={
                            formData.abnormalRate !== undefined && formData.abnormalRate !== ""
                              ? Number.parseFloat(formData.abnormalRate).toFixed(2)
                              : ""
                          }
                          onChange={(e) => {
                            const value = e.target.value
                            if (value === "" || /^\d*\.?\d*$/.test(value)) {
                              setFormData((prev) => ({
                                ...prev,
                                abnormalRate: value === "" ? "" : Number.parseFloat(value) || 0,
                              }))
                            }
                          }}
                          onFocus={(e) => {
                            e.target.select()
                            if (formData.abnormalRate) {
                              setFormData((prev) => ({
                                ...prev,
                                abnormalRate: Number.parseFloat(prev.abnormalRate).toString(),
                              }))
                            }
                          }}
                          onBlur={() => {
                            if (formData.abnormalRate !== "") {
                              setFormData((prev) => ({
                                ...prev,
                                abnormalRate: Number.parseFloat(prev.abnormalRate),
                              }))
                            }
                          }}
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "1px solid #000",
                            borderRadius: "4px",
                            backgroundColor: rateFieldsEnabled.abnormal && !isWeightBased ? "#fff" : "#f5f5f5",
                            cursor: rateFieldsEnabled.abnormal && !isWeightBased ? "text" : "not-allowed",
                          }}
                          disabled={!rateFieldsEnabled.abnormal || isWeightBased}
                          placeholder={rateFieldsEnabled.abnormal && !isWeightBased ? "0.00" : ""}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Break Bulk section - only show for cross-haul */}
                  {isCrossHaul && (
                    <div className="controller-instructions-container-input">
                      <label>Break Bulk</label>
                      <div className="controller-instructions-container-rate-group">
                        <input
                          type="number"
                          className={fieldErrors.containers ? "controller-instructions-error-field" : ""}
                          value={formData.num_breakbulk || 0}
                          min="0"
                          name="num_breakbulk"
                          onChange={(e) => handleContainerCountChange("num_breakbulk", e.target.value)}
                          disabled={disableBreakBulkFields} // Disable if not 'Container' unit type or not cross-haul
                        />
                        <div style={{ width: "100%" }}>
                          <input
                            type="text"
                            value={
                              formData.rateper_breakbulk !== undefined && formData.rateper_breakbulk !== ""
                                ? Number.parseFloat(formData.rateper_breakbulk).toFixed(2)
                                : ""
                            }
                            onChange={(e) => {
                              const value = e.target.value
                              if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                setFormData((prev) => ({
                                  ...prev,
                                  rateper_breakbulk: value === "" ? "" : Number.parseFloat(value) || 0,
                                }))
                              }
                            }}
                            onFocus={(e) => {
                              e.target.select()
                              if (formData.rateper_breakbulk) {
                                setFormData((prev) => ({
                                  ...prev,
                                  rateper_breakbulk: Number.parseFloat(prev.rateper_breakbulk).toString(),
                                }))
                              }
                            }}
                            onBlur={() => {
                              if (formData.rateper_breakbulk !== "") {
                                setFormData((prev) => ({
                                  ...prev,
                                  rateper_breakbulk: Number.parseFloat(prev.rateper_breakbulk),
                                }))
                              }
                            }}
                            style={{
                              width: "100%",
                              padding: "8px",
                              border: "1px solid #000",
                              borderRadius: "4px",
                              backgroundColor: disableBreakBulkFields ? "#f5f5f5" : "#fff", // Grey out if disabled
                              cursor: disableBreakBulkFields ? "not-allowed" : "text",
                            }}
                            disabled={disableBreakBulkFields} // Disable if not 'Container' unit type or not cross-haul
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {fieldErrors.containerCount && (
                    <div
                      className="controller-instructions-error-message"
                      style={{
                        color: "#d32f2f",
                        fontSize: "0.75rem",
                        marginTop: "4px",
                        gridColumn: "1 / -1",
                        textAlign: "center",
                        padding: "4px 8px",
                        backgroundColor: "#ffebee",
                        borderRadius: "4px",
                      }}
                    >
                      {fieldErrors.containerCount}
                    </div>
                  )}
                  {fieldErrors.rateper_breakbulk && (
                    <div
                      className="controller-instructions-error-message"
                      style={{
                        color: "#d32f2f",
                        fontSize: "0.75rem",
                        marginTop: "4px",
                        gridColumn: "1 / -1",
                        textAlign: "center",
                        padding: "4px 8px",
                        backgroundColor: "#ffebee",
                        borderRadius: "4px",
                      }}
                    >
                      {fieldErrors.rateper_breakbulk}
                    </div>
                  )}
                </div>

                {/* Hazardous, Surcharges, and Rates per - Horizontally Aligned */}
                <div className="controller-instructions-form-row" style={{ margin: "16px 0", padding: "0 10px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "nowrap",
                      width: "100%",
                      justifyContent: "flex-start",
                      flexShrink: 1,
                      minWidth: 0,
                    }}
                  >
                    {/* Hazardous Checkbox */}
                    <label className="controller-instructions-checkbox-container" style={{ margin: "5px 0" }}>
                      <input
                        type="checkbox"
                        name="hazardous"
                        checked={formData.hazardous || false}
                        onChange={handleInputChange}
                      />
                      <span className="controller-instructions-checkmark"></span>
                      Hazardous
                    </label>

                    {/* Surcharges Checkbox */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      <label className="controller-instructions-checkbox-container" style={{ margin: "5px 0" }}>
                        <input
                          type="checkbox"
                          name="surcharges"
                          checked={!!formData.surcharges}
                          onChange={(e) => {
                            const checked = e.target.checked
                            setFormData((prev) => ({
                              ...prev,
                              surcharges: checked,
                              // Only clear surchargesAmount when unchecking and there's no surcharge from the API
                              ...(!checked && !prev.sixMeterRate && !prev.twelveMeterRate && { surchargesAmount: "" }),
                            }))
                          }}
                        />
                        <span className="controller-instructions-checkmark"></span>
                        Add Surcharges
                      </label>

                      {/* Surcharge Input */}
                      {formData.surcharges && (
                        <div className="controller-instructions-input-wrapper" style={{ width: "160px" }}>
                          <input
                            type="number"
                            className="controller-instructions-form-input"
                            placeholder="Enter surcharge"
                            value={formData.surchargesAmount || ""}
                            onChange={(e) => {
                              const value = e.target.value
                              setFormData((prev) => ({
                                ...prev,
                                surchargesAmount: value,
                                surcharges: value !== "" && value !== "0",
                                preserveSurcharges: true,
                              }))
                            }}
                            onFocus={() => {
                              if (!formData.surcharges) {
                                setFormData((prev) => ({
                                  ...prev,
                                  surcharges: true,
                                }))
                              }
                            }}
                            min="0"
                            step="0.01"
                            style={{
                              width: "100%",
                              padding: "8px",
                              border: "1px solid #ccc",
                              borderRadius: "4px",
                              fontSize: "14px",
                              backgroundColor: formData.surcharges ? "#f8f9fa" : "#fff",
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Rates per Section */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ whiteSpace: "nowrap", fontSize: "13px", color: "#333" }}>Unit per:</span>
                      <div className="controller-instructions-select-wrapper" style={{ width: "100px" }}>
                        <select
                          className="controller-instructions-dropdown"
                          name="rateWeight"
                          value={formData.rateWeight}
                          onChange={handleInputChange}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            border: "1px solid #ced4da",
                            borderRadius: "4px",
                            fontSize: "13px",
                            backgroundColor: "#fff",
                            height: "32px",
                            lineHeight: "1",
                          }}
                        >
                          <option value="kg">kg</option>
                          <option value="mÂ³">mÂ³</option>
                          <option value="ton">ton</option>
                          <option value="Container">Container</option>
                        </select>
                      </div>
                      {isWeightBased && (
                        <div
                          className="controller-instructions-weight-input-group"
                          ref={fieldRefs.weight}
                          style={{ display: "flex", alignItems: "center", gap: "4px" }}
                        >
                          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                            <div className="controller-instructions-input-wrapper" style={{ width: "60px" }}>
                              <input
                                type="text"
                                className={`controller-instructions-form-input ${fieldErrors.weight ? "controller-instructions-error-field" : ""}`}
                                placeholder="Wt"
                                name="weight"
                                value={formData.weight}
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                    handleInputChange(e)
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  padding: "4px 6px",
                                  border: "1px solid #ced4da",
                                  borderRadius: "4px",
                                  fontSize: "12px",
                                  height: "28px",
                                  lineHeight: "1",
                                }}
                              />
                            </div>
                            <div className="controller-instructions-input-wrapper" style={{ width: "70px" }}>
                              <input
                                type="text"
                                className={`controller-instructions-form-input ${fieldErrors.unitrate ? "controller-instructions-error-field" : ""}`}
                                placeholder="Rate"
                                name="unitrate"
                                value={formData.unitrate || ""}
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                    handleInputChange(e)
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  padding: "4px 6px",
                                  border: "1px solid #ced4da",
                                  borderRadius: "4px",
                                  fontSize: "12px",
                                  height: "28px",
                                  lineHeight: "1",
                                }}
                              />
                            </div>
                            <span style={{ whiteSpace: "nowrap", fontSize: "13px", color: "#333" }}>
                              {formData.rateWeight}
                            </span>
                          </div>
                          <ErrorTooltip message={fieldErrors.weight} />
                          <ErrorTooltip message={fieldErrors.unitrate} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="controller-instructions-booking-vertical-group"
                style={{
                  marginTop: "8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    flexWrap: "nowrap",
                    width: "100%",
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    className="controller-instructions-form-field"
                    style={{
                      flex: "0 0 160px",
                      boxSizing: "border-sizing",
                    }}
                  >
                    <label>Shipment Type</label>
                    <div className="controller-instructions-select-wrapper" ref={fieldRefs.shipmentTypeId}>
                      <select
                        className={`controller-instructions-dropdown ${fieldErrors.shipmentTypeId ? "controller-instructions-error-field" : ""}`}
                        name="shipmentTypeId"
                        value={formData.shipmentTypeId}
                        onChange={handleShipmentTypeChange}
                        disabled={isLoading.shipmentTypes || shipmentTypes.length === 0}
                        style={{ width: "100%" }}
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
                      <ErrorTooltip message={fieldErrors.shipmentTypeId} />
                    </div>
                  </div>
                  <div className="controller-instructions-form-field" style={{ flex: "0 0 180px" }}>
                    <label>Booking Reference</label>
                    <div className="controller-instructions-input-wrapper" ref={fieldRefs.bookingRef}>
                      <input
                        type="text"
                        className={`controller-instructions-form-input ${fieldErrors.bookingRef ? "controller-instructions-error-field" : ""}`}
                        placeholder="Enter booking ref"
                        name="bookingRef"
                        value={formData.bookingRef}
                        onChange={handleInputChange}
                        style={{ width: "100%" }}
                      />
                      <ErrorTooltip message={fieldErrors.bookingRef} />
                    </div>
                  </div>
                </div>
                <div className="controller-instructions-form-field" style={{ maxWidth: "120px" }}>
                  <label>VAT Rate</label>
                  <div className="controller-instructions-input-wrapper">
                    <input
                      type="text"
                      className="controller-instructions-form-input"
                      value={`${formData.vat || 15}%`}
                      readOnly
                    />
                  </div>
                </div>

                {/* Vessel Name and Description in a row - Hidden for cross-haul */}
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                    width: "100%",
                    flexWrap: "nowrap",
                  }}
                >
                  <div style={{ display: "flex", gap: "16px", flex: "1" }}>
                    {/* Vessel Name - Hidden for cross-haul */}
                    {!isCrossHaul && (
                      <div className="controller-instructions-form-field" style={{ flex: "1", minWidth: "200px" }}>
                        <label>Vessel Name</label>
                        <div className="controller-instructions-input-wrapper" ref={fieldRefs.vesselName}>
                          <input
                            type="text"
                            className={`controller-instructions-form-input vessel-name-input ${fieldErrors.vesselName ? "controller-instructions-error-field" : ""}`}
                            placeholder="Vessel name"
                            name="vesselName"
                            value={formData.vesselName}
                            onChange={handleInputChange}
                            style={{
                              width: "100%",
                              padding: "8px",
                              border: "1px solid #ced4da",
                              borderRadius: "4px",
                              fontSize: "14px",
                              boxSizing: "border-box",
                            }}
                          />
                          <ErrorTooltip message={fieldErrors.vesselName} />
                        </div>
                      </div>
                    )}

                    {/* Description from Client */}
                    <div className="controller-instructions-form-field" style={{ flex: "1", minWidth: "200px" }}>
                      <label>Description from Client</label>
                      <div className="controller-instructions-input-wrapper" ref={fieldRefs.description}>
                        <input
                          type="text"
                          className={`controller-instructions-form-input ${fieldErrors.description ? "controller-instructions-error-field" : ""}`}
                          placeholder="Description from Client"
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "1px solid #ced4da",
                            borderRadius: "4px",
                            fontSize: "14px",
                            boxSizing: "border-box",
                          }}
                        />
                        <ErrorTooltip message={fieldErrors.description} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Date and Time Section */}
              <div className="controller-instructions-date-time-group">
                <div className="controller-instructions-shipment-task-row" style={{ order: -1, marginBottom: "8px" }}>
                  <div className="controller-instructions-form-field controller-instructions-small-field">
                    <label>File Ref</label>
                    <div className="controller-instructions-input-wrapper" ref={fieldRefs.fileRef}>
                      <input
                        type="text"
                        className={`controller-instructions-form-input ${fieldErrors.fileRef ? "controller-instructions-error-field" : ""}`}
                        placeholder="Enter file ref"
                        name="fileRef"
                        value={formData.fileRef}
                        onChange={handleInputChange}
                      />
                      <ErrorTooltip message={fieldErrors.fileRef} />
                    </div>
                  </div>
                  <div className="controller-instructions-form-field controller-instructions-small-field">
                    <label>Name of Task</label>
                    <div className="controller-instructions-input-wrapper" ref={fieldRefs.task}>
                      <input
                        type="text"
                        className={`controller-instructions-form-input ${fieldErrors.task ? "controller-instructions-error-field" : ""}`}
                        placeholder="Input Name of Task"
                        name="task"
                        value={formData.task}
                        onChange={handleInputChange}
                      />
                      <ErrorTooltip message={fieldErrors.task} />
                    </div>
                  </div>
                </div>

                <div
                  className="controller-instructions-date-time-row-1"
                  style={{
                    marginTop: "15px",
                    display: "flex",
                    gap: "15px",
                    flexWrap: "wrap",
                  }}
                >
                  <div className="controller-instructions-form-field" style={{ flex: "1", minWidth: "0" }}>
                    <label>Pick-up Time</label>
                    <div
                      className="controller-instructions-date-input-group"
                      ref={fieldRefs.pickupTime}
                      style={{ width: "100%" }}
                    >
                      <input
                        type="time"
                        className={`controller-instructions-form-input ${fieldErrors.pickupTime ? "controller-instructions-error-field" : ""}`}
                        placeholder="Time here"
                        name="pickupTime"
                        value={formData.pickupTime}
                        onChange={handleInputChange}
                        style={{ width: "75%" }}
                      />
                      <button className="controller-instructions-calendar-button"></button>
                      <ErrorTooltip message={fieldErrors.pickupTime} />
                    </div>
                  </div>
                  <div className="controller-instructions-form-field" style={{ flex: "1", minWidth: "0" }}>
                    <label>Pick-up Date</label>
                    <div
                      className="controller-instructions-date-input-group"
                      ref={fieldRefs.pickupDate}
                      style={{ width: "100%" }}
                    >
                      <input
                        type="date"
                        className={`controller-instructions-form-input ${fieldErrors.pickupDate ? "controller-instructions-error-field" : ""}`}
                        ref={pickupDateRef}
                        placeholder="Date here"
                        name="pickupDate"
                        value={formData.pickupDate}
                        onChange={handleInputChange}
                        style={{ width: "75%" }}
                      />
                      <button
                        className="controller-instructions-calendar-button"
                        onClick={() => openCalendar(pickupDateRef)}
                      ></button>
                      <ErrorTooltip message={fieldErrors.pickupDate} />
                    </div>
                  </div>
                </div>
                <div className="controller-instructions-date-time-row-2" style={{ display: "flex", gap: "15px" }}>
                  {/* Stack/ETA Date - Hidden for cross-haul */}
                  {!isCrossHaul && (
                    <div className="controller-instructions-form-field" style={{ flex: "1", minWidth: "0" }}>
                      <label>{isImport ? "ETA" : "Stack Date"}</label>
                      <div
                        className="controller-instructions-date-input-group"
                        ref={fieldRefs.stackDate}
                        style={{ width: "100%" }}
                      >
                        <input
                          type="date"
                          className={`controller-instructions-form-input ${fieldErrors.stackDate ? "controller-instructions-error-field" : ""}`}
                          ref={etaDateRef}
                          placeholder="Date here"
                          name="stackDate"
                          value={formData.stackDate}
                          onChange={handleInputChange}
                          min={formData.pickupDate || today}
                          disabled={!formData.pickupDate}
                          style={{ width: "75%" }}
                        />
                        <button
                          className="controller-instructions-calendar-button"
                          onClick={() =>
                            formData.pickupDate
                              ? openCalendar(etaDateRef)
                              : console.log("Please select a pickup date first")
                          }
                        ></button>
                        <ErrorTooltip message={fieldErrors.stackDate} />
                      </div>
                    </div>
                  )}
                  <div className="controller-instructions-form-field" style={{ flex: "1", minWidth: "0" }}>
                    <label>Deadline</label>
                    <div
                      className="controller-instructions-date-input-group"
                      ref={fieldRefs.deadline}
                      style={{ width: "100%" }}
                    >
                      <input
                        type="date"
                        className={`controller-instructions-form-input ${fieldErrors.deadline ? "controller-instructions-error-field" : ""}`}
                        ref={deadlineDateRef}
                        placeholder="Date here"
                        name="deadline"
                        value={formData.deadline}
                        onChange={handleInputChange}
                        min={formData.stackDate || formData.pickupDate || today}
                        disabled={!isCrossHaul && !formData.stackDate}
                        style={{ width: "75%" }}
                      />
                      <button
                        className="controller-instructions-calendar-button"
                        onClick={() => {
                          if (!formData.pickupDate) {
                            console.log("Please select a pickup date first")
                          } else if (!isCrossHaul && !formData.stackDate) {
                            console.log(`Please select ${isImport ? "an ETA" : "a stack date"} first`)
                          } else {
                            openCalendar(deadlineDateRef)
                          }
                        }}
                      ></button>
                      <ErrorTooltip message={fieldErrors.deadline} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Container Details Section - Only show for container-based calculations */}
        {!isWeightBased && showContainerDetails && (
          <div className="container-details-section" style={{ margin: "20px 0", width: "100%" }}>
            <div
              className="controller-instructions-form-section"
              style={{ backgroundColor: "#f8f9fa", padding: "15px", borderRadius: "4px" }}
            >
              <h4 style={{ marginBottom: "15px", color: "#0d6efd" }}>Container Details</h4>
              <div style={{ overflowX: "auto" }}>
                <table className="table" style={{ marginBottom: "0", backgroundColor: "white" }}>
                  <thead className="table-primary">
                    <tr>
                      <th style={{ width: "5%" }}>#</th>
                      <th style={{ width: "15%" }}>Container Type</th>
                      <th style={{ width: "20%" }}>Container Number</th>
                      {isImport && <th style={{ width: "15%" }}>Weight (kg)</th>}
                      <th style={{ width: isImport ? "45%" : "60%" }}>Cargo Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {containers.map((container) => (
                      <tr key={container.id}>
                        <td>{container.id}</td>
                        <td>{container.containerType}</td>
                        <td>
                          <input
                            type="text"
                            className={`form-control form-control-sm ${containerFieldErrors[`container-${container.id}`] ? "is-invalid" : ""}`}
                            value={container.containerNum}
                            onChange={(e) => handleContainerChange(container.id, "containerNum", e.target.value)}
                            placeholder="ABCD1234567"
                            maxLength={11}
                            style={{ minWidth: "120px" }}
                          />
                          {containerFieldErrors[`container-${container.id}`] && (
                            <div className="invalid-feedback d-block">
                              {containerFieldErrors[`container-${container.id}`]}
                            </div>
                          )}
                        </td>
                        {isImport && (
                          <td>
                            <div className="input-group input-group-sm">
                              <input
                                type="text"
                                className={`form-control form-control-sm ${containerFieldErrors[`weight-${container.id}`] ? "is-invalid" : ""}`}
                                value={container.weight || ""}
                                onChange={(e) => handleContainerChange(container.id, "weight", e.target.value)}
                                placeholder="0.00"
                                style={{ textAlign: "right" }}
                              />
                              <span className="input-group-text">kg</span>
                            </div>
                            {containerFieldErrors[`weight-${container.id}`] && (
                              <div className="invalid-feedback d-block">
                                {containerFieldErrors[`weight-${container.id}`]}
                              </div>
                            )}
                          </td>
                        )}
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={container.cargoDescription}
                            onChange={(e) => handleContainerChange(container.id, "cargoDescription", e.target.value)}
                            placeholder="Enter cargo description"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="controller-instructions-button-container" style={{ margin: "20px 0" }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{
              padding: "8px 24px",
              fontSize: "16px",
              fontWeight: "500",
              borderRadius: "4px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Submitting...
              </>
            ) : (
              "Submit Instruction"
            )}
          </button>

          {submitError && (
            <div className="alert alert-danger mt-3" role="alert" style={{ marginTop: "15px" }}>
              {submitError}
            </div>
          )}
        </div>
      </form>
    </div>
  )
}

export default ControllerInstructions
