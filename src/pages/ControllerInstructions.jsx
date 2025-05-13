

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
  const containerCounts = location.state?.containerCounts

  // Log received state for debugging
  console.log("ControllerInstructions received state:", location.state)
  console.log("ControllerInstructions - preservedFormData:", preservedFormData)
  console.log("ControllerInstructions - containerCounts:", containerCounts)

  // API base URL from config
  const API_BASE_URL = API_CONFIG.BASE_URL

  // Create refs for each date input
  const pickupDateRef = useRef(null)
  const etaDateRef = useRef(null)
  const deadlineDateRef = useRef(null)

  // Refs for form fields to scroll to on error
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
    fileRef: useRef(null),
    bookingRef: useRef(null), // Add ref for bookingRef
    rate: useRef(null),
    weight: useRef(null),
    num_six_meters: useRef(null),
    description: useRef(null),
    // Add refs for vessel information fields
    vesselName: useRef(null),
    voyageNo: useRef(null),
    imoNo: useRef(null),
    flagReg: useRef(null),
  }

  // State to track if shipment type is import
  const [isImport, setIsImport] = useState(false)

  // Get today's date in YYYY-MM-DD format for min date validation
  const today = new Date().toISOString().split("T")[0]

  // State for form data - initialize with preserved data if available
  const [formData, setFormData] = useState(() => {
    if (preservedFormData) {
      // If we have container counts from ControllerInstructionDetails, use those
      if (containerCounts) {
        console.log("Initializing form data with container counts:", containerCounts)
        return {
          ...preservedFormData,
          num_six_meters: containerCounts["6m"],
          num_twelve_meters: containerCounts["12m"],
          num_abnormal: containerCounts["Abnormal"],
        }
      }
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
      bookingRef: "", // Add new booking ref field
      vesselName: "", // Add vessel information fields
      voyageNo: "",
      imoNo: "",
      flagReg: "",
      rateWeight: "Container",
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

  // State to track field validation errors
  const [fieldErrors, setFieldErrors] = useState({})

  // State to track preserved containers from ControllerInstructionDetails
  const [preservedContainers, setPreservedContainers] = useState(location.state?.preservedContainers || [])

  // Function to scroll to a field with error
  const scrollToField = (fieldName) => {
    const fieldRef = fieldRefs[fieldName]
    if (fieldRef && fieldRef.current) {
      fieldRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
      // Focus the field
      setTimeout(() => {
        if (fieldRef.current.focus) {
          fieldRef.current.focus()
        }
      }, 500)
    }
  }

  // Function to open calendar
  const openCalendar = (ref) => {
    ref.current.click()
  }

  // Fetch clients and shipment types on component mount
  useEffect(() => {
    fetchClients()
    fetchShipmentTypes()

    // If we have preserved form data, check if it's an import
    if (preservedFormData && preservedFormData.shipmentTypeName) {
      setIsImport(preservedFormData.shipmentTypeName.toLowerCase() === "import")
    }
  }, [])

  // Update form data when preservedFormData or containerCounts change
  useEffect(() => {
    if (preservedFormData) {
      // If we have container counts from ControllerInstructionDetails, use those
      if (containerCounts) {
        console.log("Updating form data with container counts:", containerCounts)
        setFormData((prev) => ({
          ...preservedFormData,
          num_six_meters: containerCounts["6m"],
          num_twelve_meters: containerCounts["12m"],
          num_abnormal: containerCounts["Abnormal"],
        }))
      } else {
        setFormData(preservedFormData)
      }

      // Check if it's an import
      if (preservedFormData.shipmentTypeName) {
        setIsImport(preservedFormData.shipmentTypeName.toLowerCase() === "import")
      }
    }
  }, [preservedFormData, containerCounts])

  // Update preserved containers when location.state.preservedContainers changes
  useEffect(() => {
    if (location.state?.preservedContainers) {
      setPreservedContainers(location.state.preservedContainers)
    }
  }, [location.state?.preservedContainers])

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

    // Clear any error for this field
    setFieldErrors((prev) => ({ ...prev, clientId: "" }))
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

    // Clear any error for this field
    setFieldErrors((prev) => ({ ...prev, shipmentTypeId: "" }))
  }

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target

    if (type === "checkbox") {
      setFormData({
        ...formData,
        [name]: checked,
      })
    } else if (name === "imoNo") {
      // For IMO No, allow only numbers and limit to 15 characters
      const numbersOnly = value.replace(/[^0-9]/g, "").slice(0, 15)

      setFormData({
        ...formData,
        [name]: numbersOnly,
      })

      // Clear any error for this field
      setFieldErrors((prev) => ({ ...prev, [name]: "" }))
    } else if (name === "flagReg") {
      // For Flag Reg, allow letters, spaces, hyphens, and apostrophes
      const lettersAndSpecialChars = value.replace(/[^a-zA-Z\s\-']/g, "")

      setFormData({
        ...formData,
        [name]: lettersAndSpecialChars,
      })

      // Clear any error for this field
      setFieldErrors((prev) => ({ ...prev, [name]: "" }))
    } else if (name === "num_six_meters" || name === "num_twelve_meters" || name === "num_abnormal") {
      // Ensure container counts are at least 0
      const numValue = Number.parseInt(value)
      const validValue = isNaN(numValue) ? 0 : Math.max(0, numValue)

      // Get previous value to determine if we're increasing or decreasing
      const prevValue = formData[name]
      const isIncreasing = validValue > prevValue
      const difference = Math.abs(validValue - prevValue)

      // Update form data with new container count
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

      console.log(`Container count updated - ${name}: ${validValue}`)
      setFormData(updatedFormData)

      // Update preserved containers based on the change
      updatePreservedContainers(name, isIncreasing, difference)

      // Clear any error for this field
      setFieldErrors((prev) => ({ ...prev, containers: "" }))
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

      // Clear any error for this field
      setFieldErrors((prev) => ({ ...prev, rateWeight: "" }))
    } else if (name === "rate") {
      // Allow only positive numbers and decimal point
      if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
        const updatedFormData = {
          ...formData,
          [name]: value,
        }

        // Recalculate total_cost if both rate and required values are present
        const rate = Number.parseFloat(value)

        if (!isNaN(rate) && rate > 0) {
          if (formData.rateWeight === "Container") {
            const totalContainers = formData.num_six_meters + formData.num_twelve_meters + formData.num_abnormal
            updatedFormData.total_cost = rate * totalContainers
          } else if (formData.weight && (formData.rateWeight === "kg" || formData.rateWeight === "m³")) {
            const weight = Number.parseFloat(formData.weight)
            if (!isNaN(weight) && weight > 0) {
              updatedFormData.total_cost = rate * weight
            }
          }
        }

        setFormData(updatedFormData)

        // Clear any error for this field
        setFieldErrors((prev) => ({ ...prev, [name]: "" }))
      }
    } else if (name === "weight") {
      // Allow only positive numbers and decimal point
      if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
        const updatedFormData = {
          ...formData,
          [name]: value,
        }

        // Recalculate total_cost if both rate and weight are valid
        const weight = Number.parseFloat(value)
        const rate = Number.parseFloat(formData.rate)

        if (!isNaN(weight) && weight > 0 && !isNaN(rate) && rate > 0) {
          updatedFormData.total_cost = rate * weight
        }

        setFormData(updatedFormData)

        // Clear any error for this field
        setFieldErrors((prev) => ({ ...prev, [name]: "" }))
      }
    } else if (name === "pickupDate") {
      // For pickup date, just update the value
      setFormData({
        ...formData,
        [name]: value,
        // Reset stack date and deadline if they're now invalid
        stackDate: formData.stackDate && new Date(formData.stackDate) <= new Date(value) ? "" : formData.stackDate,
        deadline: formData.deadline && new Date(formData.deadline) <= new Date(value) ? "" : formData.deadline,
      })

      // Clear any error for this field
      setFieldErrors((prev) => ({ ...prev, pickupDate: "" }))
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })

      // Clear any error for this field
      setFieldErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  // Update preserved containers when container counts change
  const updatePreservedContainers = (containerType, isIncreasing, difference) => {
    // Map container type name to the type used in preservedContainers
    const containerTypeMap = {
      num_six_meters: "6m",
      num_twelve_meters: "12m",
      num_abnormal: "Abnormal",
    }

    const type = containerTypeMap[containerType]

    if (!type) return // Invalid container type

    if (isIncreasing) {
      // Add new containers
      const newContainers = []
      const nextId = preservedContainers.length > 0 ? Math.max(...preservedContainers.map((c) => c.id)) + 1 : 1

      for (let i = 0; i < difference; i++) {
        newContainers.push({
          id: nextId + i,
          containerKey: null,
          containerNum: "",
          weight: isImport ? "" : null,
          containerType: type,
        })
      }

      setPreservedContainers([...preservedContainers, ...newContainers])
    } else {
      // Remove containers of the specified type, starting from the most recently added
      const containersOfType = preservedContainers.filter((c) => c.containerType === type)
      const containersToKeep = containersOfType.slice(0, containersOfType.length - difference)
      const otherContainers = preservedContainers.filter((c) => c.containerType !== type)

      // Combine and reassign IDs to maintain sequential order
      const updatedContainers = [...otherContainers, ...containersToKeep].sort((a, b) => a.id - b.id)
      const reindexedContainers = updatedContainers.map((container, index) => ({
        ...container,
        id: index + 1,
      }))

      setPreservedContainers(reindexedContainers)
    }
  }

  // Handle container count changes
  const handleContainerCountChange = (type, value) => {
    // Ensure value is a number and not negative
    const numValue = Number.parseInt(value)
    const validValue = isNaN(numValue) ? 0 : Math.max(0, numValue)

    // Get previous value to determine if we're increasing or decreasing
    const prevValue = formData[type]
    const isIncreasing = validValue > prevValue
    const difference = Math.abs(validValue - prevValue)

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

    console.log(`Container count changed - ${type}: ${validValue}`)
    setFormData(updatedFormData)

    // Update preserved containers based on the change
    updatePreservedContainers(type, isIncreasing, difference)

    // Clear any error for this field
    setFieldErrors((prev) => ({ ...prev, containers: "" }))
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
      "bookingRef", // Add bookingRef to required fields
      "rate",
      "description",
      // Add vessel information fields as required
      "vesselName",
      "voyageNo",
      "imoNo",
      "flagReg",
    ]

    let isValid = true
    const errors = {}

    // Check all required fields
    for (const field of requiredFields) {
      if (!formData[field]) {
        errors[field] = `This field is required`
        isValid = false
      }
    }

    // Validate shipment type - only allow import or export
    if (formData.shipmentTypeId) {
      const selectedShipmentType = shipmentTypes.find((type) => type.shipkey.toString() === formData.shipmentTypeId)
      if (selectedShipmentType) {
        const shipmentTypeName = selectedShipmentType.shipmenttype.toLowerCase()
        if (shipmentTypeName !== "import" && shipmentTypeName !== "export") {
          errors.shipmentTypeId = "Please select either Import or Export"
          isValid = false
        }
      }
    }

    // Validate rate is a positive number
    if (formData.rate) {
      const rateValue = Number.parseFloat(formData.rate)
      if (isNaN(rateValue) || rateValue <= 0) {
        errors.rate = "Rate must be a positive number"
        isValid = false
      }
    }

    // Validate weight if kg or m³ is selected
    if ((formData.rateWeight === "kg" || formData.rateWeight === "m³") && !formData.weight) {
      errors.weight = `Please enter the weight in ${formData.rateWeight}`
      isValid = false
    }

    // Validate weight is a positive number
    if ((formData.rateWeight === "kg" || formData.rateWeight === "m³") && formData.weight) {
      const weightValue = Number.parseFloat(formData.weight)
      if (isNaN(weightValue) || weightValue <= 0) {
        errors.weight = `Weight must be a positive number`
        isValid = false
      }
    }

    // Validate IMO No contains only numbers
    if (formData.imoNo && !/^\d+$/.test(formData.imoNo)) {
      errors.imoNo = "IMO Number must contain only numbers"
      isValid = false
    }

    // Validate Flag Reg contains only letters, spaces, hyphens, and apostrophes
    if (formData.flagReg && !/^[a-zA-Z\s\-']+$/.test(formData.flagReg)) {
      errors.flagReg = "Flag Registration must contain only letters, spaces, hyphens, and apostrophes"
      isValid = false
    }

    // Validate at least one container is added
    const totalContainers = formData.num_six_meters + formData.num_twelve_meters + formData.num_abnormal
    if (totalContainers <= 0) {
      // Changed from num_six_meters to containers for the error key
      errors.containers = "Please add at least one container"
      isValid = false
    }

    // Validate date order
    if (formData.stackDate && formData.pickupDate && new Date(formData.stackDate) < new Date(formData.pickupDate)) {
      errors.stackDate = `${isImport ? "ETA" : "Stack date"} cannot be before pickup date`
      isValid = false
    }

    if (formData.deadline && formData.pickupDate && new Date(formData.deadline) < new Date(formData.pickupDate)) {
      errors.deadline = "Deadline cannot be before pickup date"
      isValid = false
    }

    if (formData.deadline && formData.stackDate && new Date(formData.deadline) < new Date(formData.stackDate)) {
      errors.deadline = `Deadline cannot be before ${isImport ? "ETA" : "stack date"}`
      isValid = false
    }

    // Set all errors
    setFieldErrors(errors)

    // If not valid, scroll to the first field with an error
    if (!isValid) {
      const firstErrorField = Object.keys(errors)[0]
      scrollToField(firstErrorField)

      // Show error in modal
      setErrorModal({
        isOpen: true,
        message: `Please fill in all required fields before proceeding.`,
      })
    }

    return isValid
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

    // Count current containers by type for logging
    const containerCounts = {
      "6m": formData.num_six_meters,
      "12m": formData.num_twelve_meters,
      Abnormal: formData.num_abnormal,
    }

    console.log("Navigating to ControllerInstructionDetails with container counts:", containerCounts)
    console.log("Preserved containers:", preservedContainers)

    // Navigate to container details page with state
    navigate("/ControllerInstructionDetails", {
      state: {
        controllerData: {
          ...updatedFormData,
          // Explicitly include container counts
          num_six_meters: formData.num_six_meters,
          num_twelve_meters: formData.num_twelve_meters,
          num_abnormal: formData.num_abnormal,
          // Explicitly include shipping fields with the correct field names for the database
          booking_ref: formData.bookingRef,
          vessel_name: formData.vesselName,
          voyage_num: formData.voyageNo,
          imo_num: formData.imoNo,
          flag_reg: formData.flagReg,
        },
        isImport: formData.shipmentTypeName.toLowerCase() === "import",
        totalContainers: totalContainers,
        preservedContainers: preservedContainers, // Pass preserved containers
        instructionId: location.state?.instructionId,
        clientId: location.state?.clientId,
        clientName: location.state?.clientName,
        selectedMonth: location.state?.selectedMonth,
        selectedYear: location.state?.selectedYear,
        activeFilter: location.state?.activeFilter,
        containerCounts: containerCounts,
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

  // Tooltip component for field errors
  const ErrorTooltip = ({ message }) => {
    if (!message) return null

    return (
      <div className="error-tooltip">
        {message}
        <div className="tooltip-arrow"></div>
      </div>
    )
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
                <div className="select-wrapper" ref={fieldRefs.clientId}>
                  <select
                    className={`dropdown ${fieldErrors.clientId ? "error-field" : ""}`}
                    name="clientId"
                    value={formData.clientId}
                    onChange={handleClientChange}
                    disabled={isLoading.clients || clients.length === 0}
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
                <div className="select-wrapper" ref={fieldRefs.shipmentTypeId}>
                  <select
                    className={`dropdown ${fieldErrors.shipmentTypeId ? "error-field" : ""}`}
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
              <div className="form-group">
                <label>Name of Task</label>
                <div className="input-wrapper" ref={fieldRefs.task}>
                  <input
                    type="text"
                    className={`form-input ${fieldErrors.task ? "error-field" : ""}`}
                    placeholder="Input Name of Task"
                    name="task"
                    value={formData.task}
                    onChange={handleInputChange}
                  />
                  <ErrorTooltip message={fieldErrors.task} />
                </div>
              </div>
            </div>

            <div className="form-row1">
              <div className="form-group">
                <label>Pick-Up Location</label>
                <div className="input-wrapper" ref={fieldRefs.pickup}>
                  <input
                    type="text"
                    className={`form-input ${fieldErrors.pickup ? "error-field" : ""}`}
                    placeholder="Input pick-up location here"
                    name="pickup"
                    value={formData.pickup}
                    onChange={handleInputChange}
                  />
                  <ErrorTooltip message={fieldErrors.pickup} />
                </div>
              </div>
              <div className="form-group">
                <label>Drop-off</label>
                <div className="input-wrapper" ref={fieldRefs.dropoff}>
                  <input
                    type="text"
                    className={`form-input ${fieldErrors.dropoff ? "error-field" : ""}`}
                    placeholder="Input drop-off location here"
                    name="dropoff"
                    value={formData.dropoff}
                    onChange={handleInputChange}
                  />
                  <ErrorTooltip message={fieldErrors.dropoff} />
                </div>
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
                <div className="date-input-group" ref={fieldRefs.pickupTime}>
                  <input
                    type="time"
                    className={`form-input ${fieldErrors.pickupTime ? "error-field" : ""}`}
                    placeholder="Time here"
                    name="pickupTime"
                    value={formData.pickupTime}
                    onChange={handleInputChange}
                  />
                  <button className="calendar-button"></button>
                  <ErrorTooltip message={fieldErrors.pickupTime} />
                </div>
              </div>

              <div className="form-group">
                <label>Pick-up Date</label>
                <div className="date-input-group" ref={fieldRefs.pickupDate}>
                  <input
                    type="date"
                    className={`form-input ${fieldErrors.pickupDate ? "error-field" : ""}`}
                    ref={pickupDateRef}
                    placeholder="Date here"
                    name="pickupDate"
                    value={formData.pickupDate}
                    onChange={handleInputChange}
                  />
                  <button className="calendar-button" onClick={() => openCalendar(pickupDateRef)}></button>
                  <ErrorTooltip message={fieldErrors.pickupDate} />
                </div>
              </div>
              <div className="form-group">
                <label>{isImport ? "ETA" : "Stack Date"}</label>
                <div className="date-input-group" ref={fieldRefs.stackDate}>
                  <input
                    type="date"
                    className={`form-input ${fieldErrors.stackDate ? "error-field" : ""}`}
                    ref={etaDateRef}
                    placeholder="Date here"
                    name="stackDate"
                    value={formData.stackDate}
                    onChange={handleInputChange}
                    min={formData.pickupDate || today} // Block past dates and pickup date
                    disabled={!formData.pickupDate} // Disable until pickup date is selected
                  />
                  <button
                    className="calendar-button"
                    onClick={() =>
                      formData.pickupDate
                        ? openCalendar(etaDateRef)
                        : setErrorModal({
                            isOpen: true,
                            message: "Please select a pickup date first",
                          })
                    }
                  ></button>
                  <ErrorTooltip message={fieldErrors.stackDate} />
                </div>
              </div>
              <div className="form-group">
                <label>Deadline</label>
                <div className="date-input-group" ref={fieldRefs.deadline}>
                  <input
                    type="date"
                    className={`form-input ${fieldErrors.deadline ? "error-field" : ""}`}
                    ref={deadlineDateRef}
                    placeholder="Date here"
                    name="deadline"
                    value={formData.deadline}
                    onChange={handleInputChange}
                    min={formData.stackDate || formData.pickupDate || today} // Block past dates, pickup date, and stack date
                    disabled={!formData.stackDate} // Disable until stack date is selected
                  />
                  <button
                    className="calendar-button"
                    onClick={() => {
                      if (!formData.pickupDate) {
                        setErrorModal({
                          isOpen: true,
                          message: "Please select a pickup date first",
                        })
                      } else if (!formData.stackDate) {
                        setErrorModal({
                          isOpen: true,
                          message: `Please select ${isImport ? "an ETA" : "a stack date"} first`,
                        })
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

          {/* Additional form sections - Redesigned to match the screenshot */}
          {/* File Ref, Booking Ref, and Rates Section */}
          <div className="form-section" style={{ backgroundColor: "#e6f7ff", padding: "20px", borderRadius: "5px" }}>
            <div
              className="file-rates-row"
              style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}
            >
              <div className="file-ref-column" style={{ width: "32%" }}>
                <label>File Reference</label>
                <div className="input-wrapper" ref={fieldRefs.fileRef}>
                  <input
                    type="text"
                    className={`form-input ${fieldErrors.fileRef ? "error-field" : ""}`}
                    placeholder="Upload file number here"
                    style={{
                      width: "100%",
                      backgroundColor: "white",
                      border: "1px solid #d9d9d9",
                      borderRadius: "4px",
                      padding: "8px 12px",
                    }}
                    name="fileRef"
                    value={formData.fileRef}
                    onChange={handleInputChange}
                  />
                  <ErrorTooltip message={fieldErrors.fileRef} />
                </div>
              </div>
              <div className="booking-ref-column" style={{ width: "32%" }}>
                <label>Booking Reference</label>
                <div className="input-wrapper" ref={fieldRefs.bookingRef}>
                  <input
                    type="text"
                    className={`form-input ${fieldErrors.bookingRef ? "error-field" : ""}`}
                    placeholder="Enter booking reference"
                    style={{
                      width: "100%",
                      backgroundColor: "white",
                      border: "1px solid #d9d9d9",
                      borderRadius: "4px",
                      padding: "8px 12px",
                    }}
                    name="bookingRef"
                    value={formData.bookingRef}
                    onChange={handleInputChange}
                  />
                  <ErrorTooltip message={fieldErrors.bookingRef} />
                </div>
              </div>
              <div className="rates-column" style={{ width: "32%" }}>
                <label>Rates per</label>
                <div className="rates-input-group" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div className="select-wrapper small" style={{ width: "120px" }}>
                    <select
                      className="dropdown"
                      style={{
                        width: "100%",
                        backgroundColor: "white",
                        border: "1px solid #d9d9d9",
                        borderRadius: "4px",
                        padding: "8px 12px",
                      }}
                      name="rateWeight"
                      value={formData.rateWeight}
                      onChange={handleInputChange}
                    >
                      <option value="kg">kg</option>
                      <option value="m³">m³</option>
                      <option value="Container">Container</option>
                    </select>
                  </div>
                  <div className="input-wrapper" ref={fieldRefs.rate} style={{ flex: 1 }}>
                    <input
                      type="text"
                      className={`form-input ${fieldErrors.rate ? "error-field" : ""}`}
                      placeholder="R 1000000/ton"
                      style={{
                        width: "100%",
                        backgroundColor: "white",
                        border: "1px solid #d9d9d9",
                        borderRadius: "4px",
                        padding: "8px 12px",
                      }}
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
                    <ErrorTooltip message={fieldErrors.rate} />
                  </div>
                </div>
                {(formData.rateWeight === "kg" || formData.rateWeight === "m³") && (
                  <div
                    className="weight-input-group"
                    style={{ marginTop: "10px", display: "flex", alignItems: "center" }}
                    ref={fieldRefs.weight}
                  >
                    <label style={{ marginRight: "10px" }}>{formData.rateWeight}</label>
                    <div className="input-wrapper">
                      <input
                        type="text"
                        className={`form-input ${fieldErrors.weight ? "error-field" : ""}`}
                        placeholder={`Enter weight in ${formData.rateWeight}`}
                        style={{
                          width: "100%",
                          backgroundColor: "white",
                          border: "1px solid #d9d9d9",
                          borderRadius: "4px",
                          padding: "8px 12px",
                        }}
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
                      <ErrorTooltip message={fieldErrors.weight} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Container section - Redesigned with smaller fields and repositioned labels */}
            <div className="trailer-section" style={{ marginTop: "20px" }}>
              <div className="trailer-title" style={{ textAlign: "center", marginBottom: "15px" }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "bold" }}>Trailer Size</h3>
              </div>
              <div className="container-row" style={{ display: "flex", alignItems: "flex-start" }}>
                <div className="no-of-containers" style={{ width: "120px", paddingTop: "10px" }}>
                  <label style={{ fontWeight: "bold" }}>No. of Containers</label>
                  {fieldErrors.containers && (
                    <div
                      className="container-error-message"
                      style={{ marginTop: "5px", fontSize: "11px", color: "#ff4d4f" }}
                    >
                      {fieldErrors.containers}
                    </div>
                  )}
                </div>
                <div className="container-boxes" style={{ display: "flex", flex: 1, gap: "10px", marginRight: "20px" }}>
                  <div
                    className="container-box"
                    style={{
                      backgroundColor: "white",
                      borderRadius: "8px",
                      padding: "10px",
                      textAlign: "center",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      flex: 1,
                    }}
                  >
                    <div style={{ fontWeight: "bold", marginBottom: "5px" }}>6m</div>
                    <input
                      type="number"
                      className={fieldErrors.containers ? "error-field" : ""}
                      value={formData.num_six_meters}
                      min="0"
                      name="num_six_meters"
                      onChange={(e) => handleContainerCountChange("num_six_meters", e.target.value)}
                      style={{
                        width: "90%",
                        padding: "5px",
                        textAlign: "center",
                        border: "1px solid #d9d9d9",
                        borderRadius: "4px",
                      }}
                    />
                  </div>
                  <div
                    className="container-box"
                    style={{
                      backgroundColor: "white",
                      borderRadius: "8px",
                      padding: "10px",
                      textAlign: "center",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      flex: 1,
                    }}
                  >
                    <div style={{ fontWeight: "bold", marginBottom: "5px" }}>12m</div>
                    <input
                      type="number"
                      value={formData.num_twelve_meters}
                      min="0"
                      name="num_twelve_meters"
                      onChange={(e) => handleContainerCountChange("num_twelve_meters", e.target.value)}
                      style={{
                        width: "90%",
                        padding: "5px",
                        textAlign: "center",
                        border: "1px solid #d9d9d9",
                        borderRadius: "4px",
                      }}
                    />
                  </div>
                  <div
                    className="container-box"
                    style={{
                      backgroundColor: "white",
                      borderRadius: "8px",
                      padding: "10px",
                      textAlign: "center",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      flex: 1,
                    }}
                  >
                    <div style={{ fontWeight: "bold", marginBottom: "5px" }}>Abnormal</div>
                    <input
                      type="number"
                      value={formData.num_abnormal}
                      min="0"
                      name="num_abnormal"
                      onChange={(e) => handleContainerCountChange("num_abnormal", e.target.value)}
                      style={{
                        width: "90%",
                        padding: "5px",
                        textAlign: "center",
                        border: "1px solid #d9d9d9",
                        borderRadius: "4px",
                      }}
                    />
                  </div>
                </div>
                <div className="vat-rate" style={{ width: "150px" }}>
                  <label style={{ fontWeight: "bold" }}>VAT Rate</label>
                  <div
                    className="vat-box"
                    style={{
                      backgroundColor: "white",
                      borderRadius: "8px",
                      padding: "10px",
                      textAlign: "center",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    }}
                  >
                    <input
                      type="text"
                      className="form-input"
                      value={`${formData.vat}%`}
                      name="vat"
                      style={{
                        width: "80%",
                        padding: "5px",
                        textAlign: "center",
                        border: "1px solid #d9d9d9",
                        borderRadius: "4px",
                      }}
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Vessel Information section */}
          <div
            className="form-section vessel-section"
            style={{
              marginTop: "20px",
              backgroundColor: "#e6f7ff",
              padding: "20px",
              borderRadius: "5px",
              border: "1px solid #d9d9d9",
            }}
          >
            <div className="vessel-info-container" style={{ width: "100%" }}>
              <div
                className="vessel-info-row"
                style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}
              >
                <div className="vessel-info-field" style={{ width: "48%" }}>
                  <label>Vessel Name</label>
                  <div className="input-wrapper" ref={fieldRefs.vesselName}>
                    <input
                      type="text"
                      className={`form-input vessel-input ${fieldErrors.vesselName ? "error-field" : ""}`}
                      placeholder="Enter vessel name"
                      style={{
                        width: "100%",
                        backgroundColor: "white",
                        border: "1px solid #d9d9d9",
                        borderRadius: "4px",
                        padding: "10px 15px",
                        fontSize: "15px",
                      }}
                      name="vesselName"
                      value={formData.vesselName}
                      onChange={handleInputChange}
                    />
                    <ErrorTooltip message={fieldErrors.vesselName} />
                  </div>
                </div>
                <div className="vessel-info-field" style={{ width: "48%" }}>
                  <label>Voyage No.</label>
                  <div className="input-wrapper" ref={fieldRefs.voyageNo}>
                    <input
                      type="text"
                      className={`form-input vessel-input ${fieldErrors.voyageNo ? "error-field" : ""}`}
                      placeholder="Enter voyage number"
                      style={{
                        width: "100%",
                        backgroundColor: "white",
                        border: "1px solid #d9d9d9",
                        borderRadius: "4px",
                        padding: "10px 15px",
                        fontSize: "15px",
                      }}
                      name="voyageNo"
                      value={formData.voyageNo}
                      onChange={handleInputChange}
                      maxLength={15}
                    />
                    <ErrorTooltip message={fieldErrors.voyageNo} />
                  </div>
                </div>
              </div>
              <div className="vessel-info-row" style={{ display: "flex", justifyContent: "space-between" }}>
                <div className="vessel-info-field" style={{ width: "48%" }}>
                  <label>IMO No.</label>
                  <div className="input-wrapper" ref={fieldRefs.imoNo}>
                    <input
                      type="text"
                      className={`form-input vessel-input ${fieldErrors.imoNo ? "error-field" : ""}`}
                      placeholder="Enter IMO number (numbers only)"
                      style={{
                        width: "100%",
                        backgroundColor: "white",
                        border: "1px solid #d9d9d9",
                        borderRadius: "4px",
                        padding: "10px 15px",
                        fontSize: "15px",
                      }}
                      name="imoNo"
                      value={formData.imoNo}
                      onChange={handleInputChange}
                      maxLength={15}
                    />
                    <ErrorTooltip message={fieldErrors.imoNo} />
                  </div>
                </div>
                <div className="vessel-info-field" style={{ width: "48%" }}>
                  <label>Flag Reg</label>
                  <div className="input-wrapper" ref={fieldRefs.flagReg}>
                    <input
                      type="text"
                      className={`form-input vessel-input ${fieldErrors.flagReg ? "error-field" : ""}`}
                      placeholder="Enter flag registration (letters only)"
                      style={{
                        width: "100%",
                        backgroundColor: "white",
                        border: "1px solid #d9d9d9",
                        borderRadius: "4px",
                        padding: "10px 15px",
                        fontSize: "15px",
                      }}
                      name="flagReg"
                      value={formData.flagReg}
                      onChange={handleInputChange}
                    />
                    <ErrorTooltip message={fieldErrors.flagReg} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description section */}
          <div
            className="form-section description-section"
            style={{
              marginTop: "20px",
              backgroundColor: "#e6f7ff",
              padding: "20px",
              borderRadius: "5px",
              border: "1px solid #d9d9d9",
            }}
          >
            <label style={{ display: "block", fontWeight: "bold", marginBottom: "15px" }}>
              Description from Client
            </label>
            <div className="textarea-wrapper" ref={fieldRefs.description}>
              <textarea
                className={`form-textarea ${fieldErrors.description ? "error-field" : ""}`}
                placeholder="Description from Client, like type of goods etc"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                style={{
                  width: "100%",
                  minHeight: "80px",
                  padding: "10px",
                  border: "1px solid #d9d9d9",
                  borderRadius: "4px",
                  resize: "vertical",
                  backgroundColor: "white",
                }}
              ></textarea>
              <ErrorTooltip message={fieldErrors.description} />
            </div>
          </div>

          <div className="button-container1" style={{ textAlign: "center", marginTop: "20px" }}>
            <button
              className="add-container-button"
              onClick={handleSubmit}
              disabled={
                isLoading.clients || isLoading.shipmentTypes || clients.length === 0 || shipmentTypes.length === 0
              }
              style={{
                backgroundColor: "#5DADE2",
                color: "white",
                padding: "10px 20px",
                border: "none",
                borderRadius: "5px",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              Add Container Details
            </button>
          </div>
        </div>
      </div>

      {/* CSS for error tooltips */}
      <style jsx>{`
        .input-wrapper, .select-wrapper, .date-input-group, .textarea-wrapper {
          position: relative;
        }
        
        .error-field {
          border: 2px solid #ff4d4f !important;
          background-color: #fff1f0 !important;
        }
        
        .error-tooltip {
          position: absolute;
          top: -40px;
          right: 0;
          background-color: #ff4d4f;
          color: white;
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 12px;
          z-index: 100;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        
        .tooltip-arrow {
          position: absolute;
          bottom: -5px;
          right: 10px;
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 5px solid #ff4d4f;
        }
        
        .container-error-message {
          color: #ff4d4f;
          font-size: 12px;
          background-color: #fff1f0;
          padding: 5px 10px;
          border-radius: 4px;
          border: 1px solid #ff4d4f;
          display: inline-block;
        }

        .vessel-info-container {
          width: 100%;
        }

        .vessel-info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .vessel-info-row:last-child {
          margin-bottom: 0;
        }

        .vessel-info-field {
          width: 48%;
        }

        .vessel-input {
          width: 100%;
          padding: 10px 15px;
          font-size: 15px;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
          background-color: white;
        }

        .file-rates-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .file-ref-column, .booking-ref-column, .rates-column {
          width: 32%;
        }

        .rates-input-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .weight-input-group {
          display: flex;
          align-items: center;
          margin-top: 10px;
        }

        .weight-input-group label {
          margin-right: 10px;
          width: 30px;
        }

        .trailer-section {
          margin-top: 20px;
        }

        .trailer-title {
          text-align: center;
          margin-bottom: 15px;
        }

        .container-row {
          display: flex;
          align-items: flex-start;
        }

        .no-of-containers {
          width: 120px;
          padding-top: 10px;
        }

        .container-boxes {
          display: flex;
          flex: 1;
          gap: 10px;
          margin-right: 20px;
        }

        .container-box {
          background-color: white;
          border-radius: 8px;
          padding: 10px;
          text-align: center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          flex: 1;
        }

        .vat-rate {
          width: 150px;
        }
      `}</style>
    </div>
  )
}

export default ControllerInstructions


